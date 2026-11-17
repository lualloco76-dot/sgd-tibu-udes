"""Reproducible UDES release tasks. Source DB connections are read-only."""
import argparse
import ast
import csv
from datetime import datetime
import hashlib
import importlib.metadata as md
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import zipfile
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '.test-artifacts/final-udes-20261109'
OUT = ROOT / 'SGD_TIBU_VERSION_FINAL_PROFESORA_UDES'
PG = Path('C:/Program Files/PostgreSQL/18')
sys.path[:0] = [str(ROOT), str(ROOT / 'backend')]


def dump_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, default=str), encoding='utf8')


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def command(args, env=None, log='comandos.log', timeout=600):
    WORK.mkdir(parents=True, exist_ok=True)
    with (WORK / log).open('ab') as output:
        result = subprocess.run([str(x) for x in args], env=env, stdout=output, stderr=output,
                                timeout=timeout, creationflags=subprocess.CREATE_NO_WINDOW)
    if result.returncode:
        raise RuntimeError('Falló ' + Path(args[0]).name + '; consulte ' + log)


def prepare():
    from dotenv import dotenv_values
    import psycopg2
    from psycopg2 import sql
    from sqlalchemy import create_engine, inspect, text
    from sqlalchemy.engine import make_url, URL
    import bcrypt
    source = make_url(dotenv_values(ROOT / 'backend/.env')['DATABASE_URL'])
    assert source.get_backend_name() == 'postgresql' and source.host in {'localhost', '127.0.0.1'}
    original = create_engine(source, hide_parameters=True,
                             connect_args={'options': '-c default_transaction_read_only=on'})
    with original.connect() as connection:
        counts = {t: connection.execute(text('SELECT COUNT(*) FROM "' + t + '"')).scalar_one()
                  for t in inspect(connection).get_table_names()}
        assert all(counts[t] == 0 for t in ['personas', 'registros_sacramentales', 'documentos', 'libros', 'solicitudes', 'certificados']), 'El origen cambió: revise la anonimización antes de distribuir'
        source_version = connection.execute(text('SHOW server_version')).scalar_one()
        schemas = inspect(connection).get_schema_names()
        signature = {}
        for table in counts:
            signature[table] = connection.execute(text(
                'SELECT md5(COALESCE(string_agg(row_to_json(t)::text, chr(10) ORDER BY row_to_json(t)::text),\'\')) FROM "' + table + '" t')).scalar_one()
    dump_json(WORK / 'origen-antes.json', dict(counts=counts, firmas=signature, version=source_version, esquemas=schemas))
    env = os.environ.copy()
    env.update(PGPASSWORD=source.password or '', PGCONNECT_TIMEOUT='10', PGOPTIONS='-c default_transaction_read_only=on')
    command([PG / 'bin/pg_dump.exe', '-h', source.host, '-p', source.port or 5432,
             '-U', source.username, '--no-password', '-d', source.database, '-Fc',
             '--no-owner', '--no-privileges', '-f', WORK / 'origen-privado.dump'], env)
    # Prepare an entirely separate, newly owned cluster using packaged management.
    os.environ.update(SGD_DATA_DIR=str(WORK / 'preparacion-datos'), SGD_DESKTOP='1',
                      DATABASE_URL='sqlite://', SECRET_KEY='build-only-' + 'x' * 48)
    import desktop.local_postgres as local
    local.binaries = lambda: PG / 'bin'
    manager = local.LocalPostgres()
    try:
        state = manager.start()
        admin = dict(host='127.0.0.1', port=state['port'], user=state['user'], password=state['password'])
        connection = psycopg2.connect(**admin, dbname='postgres')
        try:
            connection.autocommit = True
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1 FROM pg_database WHERE datname=%s', ('sgd_preparacion',))
                if cursor.fetchone():
                    raise RuntimeError('Ya existe la copia de preparación; no se sobrescribirá')
                cursor.execute('CREATE DATABASE sgd_preparacion TEMPLATE template0')
                cursor.execute('CREATE DATABASE sgd_test TEMPLATE template0')
        finally:
            connection.close()
        env.update(PGPASSWORD=state['password']); env.pop('PGOPTIONS', None)
        endpoint = ['-h', '127.0.0.1', '-p', str(state['port']), '-U', state['user'], '--no-password']
        command([PG / 'bin/pg_restore.exe', *endpoint, '--no-owner', '--no-privileges',
                 '--exit-on-error', '--single-transaction', '-d', 'sgd_preparacion', WORK / 'origen-privado.dump'], env)
        url = URL.create('postgresql+psycopg2', username=state['user'], password=state['password'],
                         host='127.0.0.1', port=state['port'], database='sgd_preparacion')
        from ejecutar_schema import migrate
        migrate(url.render_as_string(hide_password=False))
        engine = create_engine(url, hide_parameters=True)
        with engine.begin() as connection:
            connection.execute(text('DELETE FROM sesiones'))
            connection.execute(text("UPDATE usuarios SET nombre='Administrador Evaluación UDES', intentos_fallidos=0, bloqueado_hasta=NULL, debe_cambiar_password=FALSE"))
            connection.execute(text("UPDATE auditoria SET detalle=CASE WHEN detalle IS NULL THEN NULL ELSE 'Detalle histórico anonimizado para evaluación UDES' END"))
            connection.execute(text("UPDATE respaldos SET estado='fallido', error='Archivo operativo del origen excluido de la entrega', sha256=NULL, tamano=NULL, verificado=NULL"))
            connection.execute(text("UPDATE configuracion_respaldos SET frecuencia='manual', proximo=NULL, en_curso=FALSE, trabajo_id=NULL, latido=NULL"))
            account = connection.execute(text("SELECT password_hash, activo, rol FROM usuarios WHERE email='admin@iglesia.org'")).one()
            assert account.activo and account.rol == 'administrador' and bcrypt.checkpw(b'admin123', account.password_hash.encode())
            after = {t: connection.execute(text('SELECT COUNT(*) FROM "' + t + '"')).scalar_one()
                     for t in inspect(connection).get_table_names()}
            assert all(after[t] == n for t, n in counts.items() if t != 'sesiones')
            schema = {}
            inspector = inspect(connection)
            for table in after:
                columns = inspector.get_columns(table)
                for column in columns: column['type'] = str(column['type'])
                schema[table] = dict(columns=columns, pk=inspector.get_pk_constraint(table),
                                     foreign_keys=inspector.get_foreign_keys(table), unique=inspector.get_unique_constraints(table),
                                     checks=inspector.get_check_constraints(table), indexes=inspector.get_indexes(table))
            sequences = connection.execute(text('SELECT schemaname, sequencename, data_type, start_value, min_value, max_value, increment_by, cycle, last_value FROM pg_sequences WHERE schemaname=\'public\'')).mappings().all()
            assert connection.execute(text('SELECT COUNT(*) FROM pg_constraint WHERE NOT convalidated')).scalar_one() == 0
        dump_json(WORK / 'esquema.json', schema)
        dump_json(WORK / 'secuencias.json', [dict(row) for row in sequences])
        payload = WORK / 'payload'; payload.mkdir(exist_ok=True)
        for name, options in [('sgd_tibu_real.dump', ['-Fc']), ('estructura_postgresql.sql', ['--schema-only']), ('datos_evaluacion.sql', ['--data-only'])]:
            target = payload / name if name.endswith('.dump') else WORK / name
            command([PG / 'bin/pg_dump.exe', *endpoint, '-d', 'sgd_preparacion', '--no-owner', '--no-privileges', *options, '-f', target], env)
        manifest = dict(edition='evaluadores-real', version='3.0.0', source_database=source.database,
                        created_local=datetime.now(ZoneInfo('America/Bogota')).isoformat(),
                        snapshot_file='sgd_tibu_real.dump', snapshot_sha256=digest(payload / 'sgd_tibu_real.dump'),
                        counts=after, account_email='admin@iglesia.org', documents=[], anonymized=True)
        dump_json(payload / 'manifest.json', manifest)
        dump_json(WORK / 'preparacion.json', dict(original_solo_lectura=True, revision_origen='0005', revision_copia='0006',
            filas_origen=counts, filas_entrega=after, anonimizado=['usuarios.nombre', 'auditoria.detalle', 'respaldos.error/sha256/tamano/verificado'],
            excluido='11 sesiones del equipo origen; archivos operativos de respaldo no transferidos; referencia histórica conservada y marcada sin archivo',
            sin_partidas_inventadas=True, claves_foraneas_validadas=True))
        # Test both engines; only sgd_test may receive the synthetic fixtures.
        test_env = os.environ.copy()
        test_env['TEST_DATABASE_URL'] = url.set(database='sgd_test').render_as_string(hide_password=False)
        command([sys.executable, '-m', 'pytest', ROOT / 'backend/tests', '-q',
                 '-o', 'cache_dir=' + str(WORK / 'pytest-cache'),
                 '--basetemp=' + str(WORK / 'pytest-tmp'), '--junitxml=' + str(WORK / 'backend-tests.xml')], test_env, 'backend-tests.log')
        engine.dispose()
    finally:
        manager.stop()
        original.dispose()
    print('Copia anonimizada preparada; pruebas SQLite/PostgreSQL ejecutadas. Origen sin escritura.', flush=True)


def build():
    env = os.environ.copy()
    env.update(SGD_BUILD_DIR=str(WORK / 'build'), SGD_PAYLOAD_DIR=str(WORK / 'payload'))
    tools = WORK / 'build/toolchain'; tools.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / '.test-artifacts/distribution/toolchain/python-embed.zip', tools / 'python-embed.zip')
    shutil.copytree(ROOT / '.test-artifacts/distribution/toolchain/Inno', tools / 'Inno', dirs_exist_ok=True)
    command([sys.executable, ROOT / 'desktop/build.py'], env, 'build.log', timeout=1200)
    print('Ejecutable, runtime, PostgreSQL e instalador generados.', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('task', choices=['prepare', 'build'])
    args = parser.parse_args()
    globals()[args.task]()
