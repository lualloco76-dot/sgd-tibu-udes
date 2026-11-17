"""Safe first-run provisioning. All administrative credentials stay in memory."""
import json
import hashlib
import os
from pathlib import Path
import re
import secrets
import shutil
import socket
import subprocess
import sys

from alembic import command
from alembic.config import Config
import psycopg2
from psycopg2 import sql
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import URL

HEAD = '0006'


def assets():
    return Path(sys._MEIPASS) if getattr(sys, 'frozen', False) else Path(__file__).resolve().parents[1]


def migration_config(url):
    config = Config()
    config.set_main_option('script_location', str(assets() / 'backend' / 'migrations'))
    config.set_main_option('sqlalchemy.url', url.replace('%', '%%'))
    return config


def detected_postgres():
    root = Path(os.environ.get('ProgramFiles', 'C:/Program Files')) / 'PostgreSQL'
    return [str(p.parent.parent) for p in root.glob('*/bin/pg_ctl.exe')]


def release_manifest():
    root = assets() / 'desktop' / 'resources'
    manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
    if manifest.get('edition') != 'evaluadores-real' or manifest.get('snapshot_file') != 'sgd_tibu_real.dump':
        raise ValueError('La distribución no contiene la base real de esta entrega')
    dump = root / manifest['snapshot_file']
    if hashlib.sha256(dump.read_bytes()).hexdigest() != manifest['snapshot_sha256']:
        raise ValueError('La copia de la base no superó la comprobación de integridad. Reinstale el paquete')
    return manifest


def restore_database(engine, admin, database, progress):
    """Restore the user's real snapshot ONLY into an empty destination database."""
    manifest = release_manifest()
    with engine.connect() as connection:
        if inspect(connection).get_table_names():
            return False
    candidates = [assets() / 'postgresql' / 'bin' / 'pg_restore.exe'] + [Path(path) / 'bin' / 'pg_restore.exe' for path in detected_postgres() if Path(path).name == '18']
    executable = next((str(path) for path in candidates if path.is_file()), None) or shutil.which('pg_restore')
    if not executable:
        raise ValueError('Falta pg_restore. Instale Command Line Tools de PostgreSQL 18 y vuelva a intentar')
    progress('Restaurando la base real y la cuenta existente para los evaluadores…')
    env = os.environ.copy()
    env['PGPASSWORD'] = admin['password']
    env['PGCONNECT_TIMEOUT'] = '10'
    env.pop('PGOPTIONS', None)
    args = [executable, '--host', admin['host'], '--port', str(admin['port']), '--username', admin['user'],
            '--no-password', '--dbname', database, '--no-owner', '--no-privileges', '--exit-on-error',
            '--single-transaction', str(assets() / 'desktop' / 'resources' / manifest['snapshot_file'])]
    try:
        subprocess.run(args, env=env, check=True, capture_output=True, timeout=1800,
                       creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
    except subprocess.CalledProcessError:
        raise ValueError('No se completó la restauración. Revise PostgreSQL, espacio libre y permisos. No se reemplazó una base existente') from None
    return True


def verify(url):
    import app.models
    from app.database import Base
    engine = create_engine(url, connect_args={'connect_timeout': 8}, hide_parameters=True)
    try:
        with engine.connect() as connection:
            version = connection.execute(text('SELECT version_num FROM alembic_version')).scalar_one()
            if version != HEAD:
                raise ValueError('La base necesita migraciones. Abra Configurar y autorice la actualización con un respaldo previo')
            metadata = inspect(connection)
            for table in Base.metadata.sorted_tables:
                actual = {c['name'] for c in metadata.get_columns(table.name)}
                if not {c.name for c in table.columns}.issubset(actual):
                    raise ValueError('El esquema no está completo: ' + table.name)
            return {'migracion': version, 'tablas': len(Base.metadata.tables),
                    'postgresql': connection.execute(text('SHOW server_version')).scalar_one()}
    finally:
        engine.dispose()


def initialize(options, progress=lambda message: None):
    release_manifest()
    host = options.get('host', '127.0.0.1').strip()
    port = int(options.get('port', 5432))
    database = options.get('database', 'sgd_tibu_evaluadores').strip()
    role = options.get('role', 'sgd_tibu_eval_app').strip()
    mode = options.get('mode', 'real')
    for name in (database, role):
        if not re.fullmatch(r'[a-z][a-z0-9_]{2,47}', name):
            raise ValueError('Base y usuario deben tener de 3 a 48 letras minúsculas, números o guion bajo')
    if role in {'postgres', 'root', 'admin'} or database in {'postgres', 'template0', 'template1'}:
        raise ValueError('Seleccione nombres exclusivos para el SGD')
    if host not in {'127.0.0.1', 'localhost', '::1'}:
        raise ValueError('Este asistente admite PostgreSQL local. La operación en red requiere revisión técnica explícita')
    if mode != 'real':
        raise ValueError('Esta entrega utiliza exclusivamente la base real del sistema')
    progress('Comprobando host, puerto y credenciales de PostgreSQL…')
    with socket.create_connection((host, port), timeout=5):
        pass
    admin = dict(host=host, port=port, user=options.get('admin_user', 'postgres'),
                 password=options['admin_password'], dbname='postgres', connect_timeout=8)
    db_marker = 'SGD_TIBU:' + mode
    role_marker = 'SGD_TIBU:app:' + database
    password = secrets.token_urlsafe(36)
    operator = psycopg2.connect(**admin)
    operator.autocommit = True
    try:
        with operator.cursor() as cursor:
            cursor.execute('SELECT pg_try_advisory_lock(hashtext(%s))', ('SGD_TIBU:' + database,))
            if not cursor.fetchone()[0]:
                raise ValueError('Hay otra configuración de esta base en curso. Espere a que termine')
            cursor.execute('SHOW server_version_num')
            if int(cursor.fetchone()[0]) // 10000 != 18:
                raise ValueError('Esta distribución se validó con PostgreSQL 18 de 64 bits; instale esa versión')
            cursor.execute("SELECT shobj_description(oid, 'pg_database') FROM pg_database WHERE datname=%s", (database,))
            existing = cursor.fetchone()
            if existing:
                if existing[0] != db_marker:
                    raise ValueError('La base ya existe y no pertenece a este modo del SGD. Use una base nueva; no se modificó su contenido')
                if not options.get('allow_existing', False):
                    raise ValueError('La base ya existe. Respalde y marque la autorización para reutilizar o migrar la instalación')
            cursor.execute("SELECT shobj_description(oid, 'pg_authid'), rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls FROM pg_roles WHERE rolname=%s", (role,))
            current_role = cursor.fetchone()
            if current_role and (current_role[0] != role_marker or any(current_role[1:])):
                raise ValueError('El usuario PostgreSQL indicado ya existe y no es un usuario limitado de esta instalación')
            cursor.execute('SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname=%s', (role,))
            if cursor.fetchone():
                raise ValueError('El usuario de aplicación tiene membresías adicionales. Revise sus permisos')
            if not current_role:
                cursor.execute(sql.SQL('CREATE ROLE {} LOGIN PASSWORD {} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS').format(sql.Identifier(role), sql.Literal(password)))
                cursor.execute(sql.SQL('COMMENT ON ROLE {} IS {}').format(sql.Identifier(role), sql.Literal(role_marker)))
            if not existing:
                progress('Creando una base nueva del sistema…')
                cursor.execute(sql.SQL('CREATE DATABASE {} TEMPLATE template0 ENCODING {}').format(sql.Identifier(database), sql.Literal('UTF8')))
                cursor.execute(sql.SQL('COMMENT ON DATABASE {} IS {}').format(sql.Identifier(database), sql.Literal(db_marker)))
                cursor.execute(sql.SQL('REVOKE ALL ON DATABASE {} FROM PUBLIC').format(sql.Identifier(database)))
            cursor.execute(sql.SQL('GRANT CONNECT ON DATABASE {} TO {}').format(sql.Identifier(database), sql.Identifier(role)))
        admin_url = URL.create('postgresql+psycopg2', username=admin['user'], password=admin['password'], host=host, port=port, database=database)
        engine = create_engine(admin_url, hide_parameters=True)
        try:
            with engine.connect() as connection:
                if inspect(connection).get_table_names() and 'alembic_version' not in inspect(connection).get_table_names():
                    raise ValueError('La base contiene un esquema sin versión. Requiere revisión manual en una copia')
            progress('Aplicando las migraciones originales y verificando tablas…')
            restore_database(engine, admin, database, progress)
            command.upgrade(migration_config(admin_url.render_as_string(hide_password=False)), 'head')
            with engine.connect() as connection:
                if not connection.execute(text('SELECT COUNT(*) FROM usuarios WHERE email=:email AND activo=TRUE AND rol=:rol'),
                                          dict(email='admin@iglesia.org', rol='administrador')).scalar_one():
                    raise ValueError('La base no contiene la cuenta administradora de esta entrega; no se crearon usuarios de reemplazo')
            with engine.begin() as connection:
                raw = connection.connection.driver_connection
                with raw.cursor() as cursor:
                    cursor.execute('REVOKE CREATE ON SCHEMA public FROM PUBLIC')
                    cursor.execute(sql.SQL('GRANT USAGE ON SCHEMA public TO {}').format(sql.Identifier(role)))
                    cursor.execute(sql.SQL('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {}').format(sql.Identifier(role)))
                    cursor.execute(sql.SQL('REVOKE ALL ON TABLE alembic_version FROM {}').format(sql.Identifier(role)))
                    cursor.execute(sql.SQL('GRANT SELECT ON TABLE alembic_version TO {}').format(sql.Identifier(role)))
                    cursor.execute(sql.SQL('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {}').format(sql.Identifier(role)))
                    if current_role:
                        cursor.execute(sql.SQL('ALTER ROLE {} PASSWORD {}').format(sql.Identifier(role), sql.Literal(password)))
        finally:
            engine.dispose()
        url = URL.create('postgresql+psycopg2', username=role, password=password, host=host, port=port, database=database).render_as_string(hide_password=False)
        result = verify(url)
        return dict(database_url=url, secret_key=secrets.token_urlsafe(48), mode=mode, edition='evaluadores-real', port=8765, verification=result)
    finally:
        operator.close()


