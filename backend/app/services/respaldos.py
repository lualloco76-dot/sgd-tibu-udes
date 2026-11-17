"""Private full backups, with a database-wide lease shared by API workers."""
import hashlib
from contextlib import closing
import json
import logging
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
from tempfile import TemporaryDirectory
from threading import Event, Thread
from uuid import uuid4
from zipfile import ZipFile, ZIP_DEFLATED, BadZipFile
from datetime import timedelta
from zoneinfo import ZoneInfo
from fastapi import HTTPException
from sqlalchemy import update, select
from app.config import settings
from app.core.security import utcnow, aware
from app.models.administracion import ConfiguracionRespaldo, Respaldo
from app.models.documento import Documento
from app.models.auditoria import Auditoria

BOGOTA = ZoneInfo('America/Bogota')
logger = logging.getLogger('sgd.respaldos')


def pg_dump_path():
    found = shutil.which(settings.PG_DUMP_PATH)
    if found or settings.PG_DUMP_PATH != 'pg_dump' or os.name != 'nt':
        return found
    root = Path(os.environ.get('ProgramFiles', 'C:/Program Files')) / 'PostgreSQL'
    versions = sorted(root.glob('*/bin/pg_dump.exe'), key=lambda path: int(path.parents[1].name) if path.parents[1].name.isdigit() else 0, reverse=True)
    return str(versions[0]) if versions else None


def siguiente(frecuencia, hora, now=None):
    if frecuencia == 'manual':
        return None
    local = (now or utcnow()).astimezone(BOGOTA)
    candidate = local.replace(hour=hora, minute=0, second=0, microsecond=0)
    if frecuencia == 'semanal':
        candidate += timedelta(days=(6 - local.weekday()) % 7)
    if candidate <= local:
        candidate += timedelta(days=7 if frecuencia == 'semanal' else 1)
    return candidate.astimezone(ZoneInfo('UTC'))


def configuracion(db):
    row = db.get(ConfiguracionRespaldo, 1)
    if row is None:
        row = ConfiguracionRespaldo(id=1, frecuencia='manual', hora=2, en_curso=False)
        db.add(row)
        db.commit()
    if row.en_curso and row.latido and aware(row.latido) < utcnow() - timedelta(minutes=5):
        stale_id = row.trabajo_id
        # A worker renews the lease during a dump. Reclaim only its exact stale lease.
        result = db.execute(update(ConfiguracionRespaldo).where(
            ConfiguracionRespaldo.id == 1, ConfiguracionRespaldo.en_curso.is_(True),
            ConfiguracionRespaldo.latido == row.latido).values(en_curso=False, trabajo_id=None, latido=None))
        if result.rowcount == 1:
            db.execute(update(Respaldo).where(Respaldo.id == stale_id, Respaldo.estado == 'en_curso')
                       .values(estado='fallido', terminado=utcnow(), error='La tarea se interrumpió al perder la conexión con el servidor. Cree una nueva copia'))
            db.add(Auditoria(accion='RESPALDO_INTERRUMPIDO', entidad='respaldos', detalle='Reserva vencida del programador'))
            db.commit()
        else:
            db.rollback()
        db.refresh(row)
    return row


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def ruta(id):
    root = Path(settings.BACKUP_DIR).resolve()
    path = root / f'{id}.zip'
    if path.is_symlink() or path.resolve().parent != root:
        raise HTTPException(409, 'Ubicación de respaldo inválida')
    return path


def reservar(db, user=None, origen='manual', scheduled=False):
    config = configuracion(db)
    now = utcnow()
    id = uuid4().hex
    if scheduled and (config.frecuencia == 'manual' or not config.proximo or aware(config.proximo) > now):
        return None
    conditions = [ConfiguracionRespaldo.id == 1, ConfiguracionRespaldo.en_curso.is_(False)]
    values = {'en_curso': True, 'trabajo_id': id, 'latido': now}
    if scheduled:
        conditions += [ConfiguracionRespaldo.proximo <= now, ConfiguracionRespaldo.frecuencia != 'manual']
        values['proximo'] = siguiente(config.frecuencia, config.hora)
    claimed = db.execute(update(ConfiguracionRespaldo).where(*conditions).values(**values))
    if claimed.rowcount != 1:
        db.rollback()
        if scheduled:
            return None
        raise HTTPException(409, 'Ya hay un respaldo en curso. Espere a que termine')
    job = Respaldo(id=id, origen=origen, estado='en_curso', creado=now, usuario_id=user.id if user else None)
    db.add(job)
    db.add(Auditoria(usuario_id=job.usuario_id, accion='INICIAR_RESPALDO', entidad='respaldos', detalle=f'id={job.id};origen={origen}'))
    db.commit()
    return job


def volcar(engine, destination):
    if engine.dialect.name == 'sqlite':
        with engine.connect() as connection, closing(sqlite3.connect(destination)) as target:
            connection.connection.driver_connection.backup(target)
        return
    if engine.dialect.name != 'postgresql':
        raise RuntimeError('Motor de base de datos no compatible con respaldos')
    executable = pg_dump_path()
    if not executable:
        raise RuntimeError('Instale pg_dump y configure PG_DUMP_PATH en el servidor')
    url = engine.url
    env = os.environ.copy()
    env['PGCONNECT_TIMEOUT'] = '15'
    for key, value in [('PGPASSWORD', url.password), ('PGSSLMODE', url.query.get('sslmode')), ('PGOPTIONS', url.query.get('options'))]:
        if value is not None:
            env[key] = str(value)
    args = [executable, '--format=custom', '--no-password', '--file', str(destination), '--dbname', url.database]
    for flag, value in [('--host', url.host), ('--port', url.port), ('--username', url.username)]:
        if value is not None:
            args += [flag, str(value)]
    try:
        subprocess.run(args, env=env, check=True, capture_output=True, timeout=1800,
                       creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
    except subprocess.CalledProcessError:
        raise RuntimeError('pg_dump no completó la copia. Revise versión, conexión y permisos del servidor') from None


def ejecutar(factory, id):
    stop_heartbeat = Event()
    lease_lost = Event()

    def heartbeat():
        while not stop_heartbeat.wait(20):
            try:
                with factory() as session:
                    renewed = session.execute(update(ConfiguracionRespaldo).where(
                        ConfiguracionRespaldo.id == 1, ConfiguracionRespaldo.en_curso.is_(True),
                        ConfiguracionRespaldo.trabajo_id == id).values(latido=utcnow()))
                    session.commit()
                    if renewed.rowcount != 1:
                        lease_lost.set()
                        return
            except Exception:
                lease_lost.set()
                return

    with factory() as db:
        job = db.get(Respaldo, id)
        if not job or job.estado != 'en_curso':
            return
        archive = ruta(id)
        partial = archive.with_suffix('.partial')
        renewal = Thread(target=heartbeat, name='sgd-respaldo-latido', daemon=True)
        renewal.start()
        try:
            archive.parent.mkdir(parents=True, exist_ok=True)
            engine = db.get_bind()
            with TemporaryDirectory(prefix='sgd-', dir=archive.parent) as temporary:
                dump = Path(temporary) / ('base.sqlite' if engine.dialect.name == 'sqlite' else 'base.dump')
                volcar(engine, dump)
                manifest = {'version': 1, 'motor': engine.dialect.name, 'creado': job.creado.isoformat(), 'archivos': {}}
                with ZipFile(partial, 'w', compression=ZIP_DEFLATED, allowZip64=True) as zipfile:
                    zipfile.write(dump, dump.name)
                    manifest['archivos'][dump.name] = digest(dump)
                    root = Path(settings.UPLOAD_DIR).resolve()
                    # Back up every referenced document; never silently omit a missing file.
                    for document in db.query(Documento).order_by(Documento.id):
                        path = Path(document.ruta_archivo).resolve()
                        if not path.is_relative_to(root) or not path.is_file():
                            raise RuntimeError('Falta un archivo documental o está fuera del almacenamiento configurado')
                        name = 'documentos/' + path.relative_to(root).as_posix()
                        checksum = digest(path)
                        if checksum != document.hash_sha256:
                            raise RuntimeError('Un documento no superó la verificación de integridad')
                        if name not in manifest['archivos']:
                            zipfile.write(path, name)
                            manifest['archivos'][name] = checksum
                    zipfile.writestr('manifiesto.json', json.dumps(manifest, ensure_ascii=False, indent=2))
                    zipfile.writestr('RESTAURAR.txt', 'Restaure primero en una base de pruebas.\nPostgreSQL: pg_restore --no-owner --dbname BASE_PRUEBAS base.dump\nSQLite: use base.sqlite como una base nueva.\nCopie documentos/ al UPLOAD_DIR y concilie las rutas de documentos.ruta_archivo si cambia el servidor.\nEl ZIP contiene información privada. Guárdelo en un lugar con acceso restringido.\nLa verificación de integridad no sustituye una prueba de restauración.\n')
                owner = db.execute(select(ConfiguracionRespaldo.trabajo_id).where(ConfiguracionRespaldo.id == 1)).scalar_one()
                if lease_lost.is_set() or owner != id:
                    raise RuntimeError('La tarea perdió su reserva en el servidor. Cree una nueva copia')
                partial.replace(archive)
            job.sha256 = digest(archive)
            job.tamano = archive.stat().st_size
            comprobar(archive, job.sha256)
            job.estado = 'completado'
            job.verificado = utcnow()
        except Exception as error:
            logger.error('Respaldo %s fallido (%s)', id, type(error).__name__)
            # Never persist subprocess stderr, credentials, or private file paths.
            job.estado = 'fallido'
            job.error = str(error)[:300] if type(error) is RuntimeError else 'No se pudo completar el respaldo. Revise espacio, almacenamiento y configuración del servidor'
            for file in (archive, partial):
                try:
                    file.unlink(missing_ok=True)
                except OSError:
                    logger.error('No se pudo retirar el archivo parcial del respaldo %s', id)
        finally:
            stop_heartbeat.set()
            renewal.join(timeout=2)
        job.terminado = utcnow()
        db.execute(update(ConfiguracionRespaldo).where(ConfiguracionRespaldo.id == 1, ConfiguracionRespaldo.trabajo_id == id)
                   .values(en_curso=False, trabajo_id=None, latido=None))
        db.add(Auditoria(usuario_id=job.usuario_id, accion='RESPALDO_' + job.estado.upper(), entidad='respaldos', detalle=f'id={id}'))
        db.commit()


def comprobar(path, expected):
    if not path.is_file():
        raise HTTPException(404, 'El archivo de respaldo no está disponible en el servidor')
    if digest(path) != expected:
        raise HTTPException(409, 'El respaldo no superó la verificación SHA-256')
    try:
        with ZipFile(path) as archive:
            manifest = json.loads(archive.read('manifiesto.json'))
            for name, checksum in manifest['archivos'].items():
                with archive.open(name) as stream:
                    if hashlib.file_digest(stream, 'sha256').hexdigest() != checksum:
                        raise HTTPException(409, 'El contenido del respaldo está dañado')
    except (BadZipFile, KeyError, ValueError):
        raise HTTPException(409, 'El archivo de respaldo está incompleto o dañado') from None


def iniciar_programador(factory):
    stop = Event()

    def loop():
        while not stop.wait(30):
            try:
                with factory() as db:
                    job = reservar(db, origen='automatico', scheduled=True)
                    id = job.id if job else None
                if id:
                    ejecutar(factory, id)
            except Exception as error:
                logger.error('Programador de respaldos no disponible (%s)', type(error).__name__)

    thread = Thread(target=loop, name='sgd-respaldos', daemon=True)
    thread.start()
    return stop
