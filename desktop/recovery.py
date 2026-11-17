"""Finish local verification: restart, real-mode isolation, dump and restore."""
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate import ROOT, BUILD, LAB, PUBLIC, PG, prepare, configure, launch, run, write
from desktop.secure_config import read


def fingerprints(engine):
    import hashlib
    from sqlalchemy import inspect, text
    result = []
    with engine.connect() as c:
        for table in sorted(inspect(c).get_table_names()):
            rows = c.execute(text('SELECT row_to_json(t)::text FROM "' + table + '" t')).scalars().all()
            result.append(dict(tabla=table, filas=len(rows), sha256=hashlib.sha256('\n'.join(sorted(rows)).encode()).hexdigest()))
    return result


def main():
    import httpx
    import psycopg2
    from sqlalchemy import create_engine, inspect, text
    from sqlalchemy.engine import URL
    state = prepare()
    exe = LAB / 'installed/SGD_Tibu.exe'
    run([exe, '--stop']); time.sleep(2)
    config = read('config.dat')
    engine = create_engine(config['database_url'])
    before = fingerprints(engine)
    # Reinstall the same real offline installer, without modifying the data dir.
    run([BUILD / 'inno-output/SGD_Tibu_Setup.exe', '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/DIR=' + str(exe.parent), '/LOG=' + str(LAB / 'upgrade.log')])
    after = fingerprints(engine); assert before == after
    process, started = launch(exe)
    with httpx.Client(base_url=started['url'], trust_env=False) as client:
        assert client.get('/health').status_code == 200
    run([exe, '--stop']); process.wait(timeout=40)
    assert process.returncode == 0
    write('actualizacion-reinicio.json', dict(reinstalacion_conserva_tablas_y_filas=True, comparacion=before,
          cierre_ordenado=True, reapertura=True, reinicio_windows_real=False, nota='Reapertura del ejecutable y reinstalación en el equipo; sin reinicio de Windows'))
    # A new empty real installation has NO public demonstration accounts.
    actual = {**state, 'database': 'sgd_tibu_real_test', 'role': 'sgd_tibu_real_app'}
    real_dir = LAB / 'real-data'
    email = 'administracion.ficticia@example.org'; password = secrets.token_urlsafe(24)
    configure(exe, actual, mode='real', directory=real_dir, email=email, password=password)
    process, started = launch(exe, real_dir)
    try:
        with httpx.Client(base_url=started['url'], trust_env=False, timeout=20) as client:
            login = client.post('/api/auth/login', json={'email': email, 'password': password, 'parroquia_id': None})
            assert login.status_code == 200
            headers = {'Authorization': 'Bearer ' + login.json()['access_token']}
            assert client.get('/api/auth/me', headers=headers).json()['debe_cambiar_password']
            assert client.get('/api/personas/', headers=headers).status_code == 403
            assert client.post('/api/auth/change-password', headers=headers, json={'actual': password, 'nueva': secrets.token_urlsafe(24)}).status_code == 200
            for account in json.loads((ROOT / 'desktop/demo_accounts.json').read_text()):
                assert client.post('/api/auth/login', json={'email': account['email'], 'password': account['password'], 'parroquia_id': None}).status_code == 401
        write('modo-real.json', dict(base_independiente=True, sin_cuentas_demo=True, contraseña_temporal_exigida=True, cambio_password=True))
    finally:
        env = os.environ.copy(); env['SGD_DATA_DIR'] = str(real_dir)
        run([exe, '--stop'], env=env); process.wait(timeout=40)
    # Attempted reuse of a demo DB as real must be refused before changing it.
    refused = configure(exe, state, mode='real', allow=True, expected=1, email=email, password=secrets.token_urlsafe(24))
    assert 'modo' in refused['detalle']
    write('aislamiento-modos.json', dict(demo_a_real_bloqueado=True, detalle=refused['detalle']))
    # The deliverable dump comes from a NEW demo DB, never from the exercised one.
    clean = {**state, 'database': 'sgd_tibu_demo_distribucion', 'role': 'sgd_tibu_dist_app'}
    configure(exe, clean, directory=LAB / 'distribution-data')
    dbout = PUBLIC / 'base'; dbout.mkdir(exist_ok=True)
    env = os.environ.copy(); env['PGPASSWORD'] = state['password']; env['PGCONNECT_TIMEOUT'] = '10'
    flags = ['-h','127.0.0.1','-p','55453','-U','sgd_build_admin','--no-password']
    run([PG / 'pg_dump.exe', *flags, '-d', clean['database'], '-Fc', '--no-owner', '--no-privileges', '-f', dbout / 'sgd_tibu_demo.dump'], env=env)
    run([PG / 'pg_dump.exe', *flags, '-d', clean['database'], '--schema-only', '--no-owner', '--no-privileges', '-f', dbout / 'estructura.sql'], env=env)
    c = psycopg2.connect(host='127.0.0.1',port=55453,user='sgd_build_admin',password=state['password'],dbname='postgres');c.autocommit=True
    try:
        with c.cursor() as cursor: cursor.execute('CREATE DATABASE sgd_tibu_restore_test TEMPLATE template0 ENCODING \'UTF8\'')
    finally: c.close()
    run([PG / 'pg_restore.exe', *flags, '-d', 'sgd_tibu_restore_test', '--no-owner', '--no-privileges', '--exit-on-error', dbout / 'sgd_tibu_demo.dump'], env=env)
    def admin_engine(database):
        return create_engine(URL.create('postgresql+psycopg2', username='sgd_build_admin', password=state['password'], host='127.0.0.1',port=55453,database=database))
    source, restored = admin_engine(clean['database']), admin_engine('sgd_tibu_restore_test')
    a,b = fingerprints(source), fingerprints(restored)
    assert a == b
    with source.connect() as c:
        assert c.execute(text('SELECT COUNT(*) FROM usuarios')).scalar_one() == 7
        assert c.execute(text('SELECT COUNT(*) FROM sesiones')).scalar_one() == 0
        assert c.execute(text('SELECT COUNT(*) FROM documentos')).scalar_one() == 0
        assert c.execute(text('SELECT COUNT(*) FROM certificados')).scalar_one() == 0
    write('restauracion.json', dict(resultado='APROBADA', tablas=a, filas_y_hashes_coinciden=True, base_origen='Nueva base exclusivamente ficticia', base_destino='sgd_tibu_restore_test', contraseñas='Solo siete cuentas públicas de demostración; hashes bcrypt'))
    # Exact physical dictionary, constraints and indexes used by deliver.py.
    with source.connect() as c:
        inspector = inspect(c)
        schema = {}
        for table in sorted(inspector.get_table_names()):
            columns = inspector.get_columns(table)
            for column in columns: column['type'] = str(column['type'])
            schema[table] = dict(columns=columns, pk=inspector.get_pk_constraint(table),
                                 foreign_keys=inspector.get_foreign_keys(table), unique=inspector.get_unique_constraints(table),
                                 checks=inspector.get_check_constraints(table), indexes=inspector.get_indexes(table))
    write('esquema.json', schema)
    for item in (engine,source,restored): item.dispose()
    print('Reapertura, reinstalación, modo real aislado y restauración verificadas')


if __name__ == '__main__':
    main()
