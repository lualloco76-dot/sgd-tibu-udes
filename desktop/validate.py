"""Real packaged-executable tests against a new synthetic PostgreSQL cluster.

This is NOT a clean Windows VM test. It never reads backend/.env or uses the
existing PostgreSQL service. Administrative laboratory credentials use DPAPI.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import secrets
import shutil
import socket
import subprocess
import sys
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / 'backend'))
BUILD = ROOT / '.test-artifacts' / 'distribution'
LAB = BUILD / 'lab'
PUBLIC = BUILD / 'evidence'
PG = Path('C:/Program Files/PostgreSQL/18/bin')
os.environ['SGD_DATA_DIR'] = str(LAB / 'demo-data')
os.environ['SGD_DESKTOP'] = '1'
os.environ['DATABASE_URL'] = 'sqlite://'
os.environ['SECRET_KEY'] = secrets.token_urlsafe(48)
from desktop.secure_config import save, read


def write(name, value):
    path = PUBLIC / name; path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf8')


def run(args, env=None, timeout=180):
    # pg_ctl descendants must not inherit PIPE handles: communicate() would wait
    # for a long-lived postgres process even after pg_ctl itself has exited.
    log = LAB / ('command-' + uuid.uuid4().hex + '.log')
    LAB.mkdir(parents=True, exist_ok=True)
    with log.open('wb') as output:
        result = subprocess.run(list(map(str, args)), env=env, stdout=output, stderr=output, timeout=timeout,
                                creationflags=subprocess.CREATE_NO_WINDOW)
    if result.returncode:
        raise RuntimeError('Falló ' + Path(args[0]).name + ' (código ' + str(result.returncode) + ')')
    return result


def prepare():
    import psycopg2
    LAB.mkdir(parents=True, exist_ok=True); PUBLIC.mkdir(parents=True, exist_ok=True)
    state = read('lab.dat')
    if state:
        return state
    with socket.socket() as check:
        check.bind(('127.0.0.1', 55453))
    password = secrets.token_urlsafe(32)
    temporary = LAB / 'init-password.tmp'
    temporary.write_text(password, encoding='utf8')
    try:
        run([PG / 'initdb.exe', '-D', LAB / 'pgdata-v2', '-U', 'sgd_build_admin', '-A', 'scram-sha-256', '--encoding=UTF8', '--locale=C', '--pwfile=' + str(temporary)])
    finally:
        temporary.unlink(missing_ok=True)
    state = dict(password=password, database='sgd_tibu_demo', role='sgd_tibu_demo_app', port=55453)
    save('lab.dat', state)
    run([PG / 'pg_ctl.exe', '-D', LAB / 'pgdata-v2', '-l', LAB / 'postgres-v2.log', '-o', '-h 127.0.0.1 -p 55453', '-w', 'start'])
    c = psycopg2.connect(host='127.0.0.1', port=55453, user='sgd_build_admin', password=password, dbname='postgres')
    c.autocommit = True
    try:
        with c.cursor() as cursor:
            cursor.execute('CREATE DATABASE sgd_test')
    finally:
        c.close()
    return state


def configure(executable, state, mode='demo', allow=False, directory=None, expected=0, **extra):
    env = os.environ.copy()
    if directory: env['SGD_DATA_DIR'] = str(directory)
    values = dict(host='127.0.0.1', port=state['port'], database=state['database'], role=state['role'],
                  admin_user='sgd_build_admin', admin_password=state['password'], mode=mode, allow_existing=allow, **extra)
    env['SGD_SETUP_JSON'] = json.dumps(values)
    path = LAB / ('configure-' + uuid.uuid4().hex + '.json')
    result = subprocess.run([str(executable), '--configure-env', '--result', str(path)], env=env, timeout=120)
    assert result.returncode == expected, path.read_text() if path.exists() else 'Sin reporte de configuración'
    return json.loads(path.read_text())


def launch(executable, directory=None):
    env = os.environ.copy()
    if directory: env['SGD_DATA_DIR'] = str(directory)
    # No Node/Python executables are available through PATH to the installed process.
    env['PATH'] = str(Path(os.environ['WINDIR']) / 'System32')
    env.pop('PYTHONPATH', None); env.pop('PYTHONHOME', None)
    result = LAB / ('start-' + uuid.uuid4().hex + '.json')
    process = subprocess.Popen([str(executable), '--serve-only', '--no-browser', '--result', str(result)], env=env)
    for _ in range(150):
        if result.exists():
            value = json.loads(result.read_text())
            assert value['estado'] == 'disponible', value
            return process, value
        if process.poll() is not None: raise RuntimeError('El ejecutable se cerró sin iniciar')
        time.sleep(.2)
    process.terminate(); raise RuntimeError('El ejecutable no respondió')


def stop(executable, process, directory=None):
    env = os.environ.copy()
    if directory: env['SGD_DATA_DIR'] = str(directory)
    run([executable, '--stop'], env=env)
    process.wait(timeout=40)
    assert process.returncode == 0


def exercise():
    import httpx
    import psycopg2
    from sqlalchemy import create_engine, text, inspect
    from sqlalchemy.engine import URL
    state = prepare()
    installer = BUILD / 'inno-output/SGD_Tibu_Setup.exe'
    install_root = LAB / 'installed'
    installer_report = LAB / 'installer.txt'
    run([installer, '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/DIR=' + str(install_root), '/LOG=' + str(installer_report)])
    assert 'Installation process succeeded' in installer_report.read_text(encoding='utf-8-sig')
    executable = install_root / 'SGD_Tibu.exe'
    write('instalador.json', dict(resultado='APROBADO', archivo='SGD_Tibu_Setup.exe', windows=platform.platform(),
                               arquitectura=platform.machine(), python_node_requeridos_por_destinatario=False,
                               instalacion_limpia_windows=False, limitacion='Equipo de desarrollo; PATH sin Python/Node durante ejecución. No equivale a VM limpia.'))
    configured = configure(executable, state, allow=bool(read('config.dat')))
    write('configuracion.json', configured)
    config = read('config.dat')
    assert config and 'admin_password' not in config and 'sgd_build_admin' not in json.dumps(config)
    raw = (LAB / 'demo-data/config.dat').read_bytes()
    assert config['database_url'].encode() not in raw
    with psycopg2.connect(host='127.0.0.1', port=55453, user='sgd_build_admin', password=state['password'], dbname=state['database']) as c:
        with c.cursor() as cur:
            cur.execute("SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=%s", (state['role'],))
            role = cur.fetchone(); assert not any(role[1:])
    engine = create_engine(config['database_url'])
    with engine.connect() as c:
        assert not c.execute(text("SELECT has_schema_privilege(current_user, 'public', 'CREATE')")).scalar_one()
        assert not c.execute(text("SELECT has_table_privilege(current_user, 'alembic_version', 'UPDATE')")).scalar_one()
        counts = {t: c.execute(text('SELECT COUNT(*) FROM "' + t + '"')).scalar_one() for t in inspect(c).get_table_names()}
    write('seguridad.json', dict(dpapi=True, contraseña_administrativa_persistida=False, rol_limitado=True, crear_esquema=False, modificar_version_migraciones=False))
    configure(executable, state, expected=1)  # Existing DB requires explicit consent.
    configure(executable, state, allow=True)
    config = read('config.dat')
    engine.dispose(); engine = create_engine(config['database_url'])
    with engine.connect() as c:
        assert counts == {t: c.execute(text('SELECT COUNT(*) FROM "' + t + '"')).scalar_one() for t in inspect(c).get_table_names()}
    accounts = json.loads((ROOT / 'desktop/demo_accounts.json').read_text())
    process, startup = launch(executable)
    results = []
    try:
        with httpx.Client(base_url=startup['url'], timeout=30, trust_env=False, follow_redirects=True) as client:
            assert client.get('/login').status_code == 200
            assert '<html' in client.get('/login').text.lower()
            assert client.get('/configuracion').status_code == 200
            assert client.get('/api/no-existe').status_code == 404
            assert client.get('/assets/no-existe.js').status_code == 404
            assert client.post('/__desktop/stop').status_code == 403
            tokens = {}
            parishes = client.get('/api/auth/parroquias').json()
            for item in accounts:
                parish = parishes[0]['id'] if item['role'] in {'parroco','secretario_parroquial','consulta'} else None
                response = client.post('/api/auth/login', json=dict(email=item['email'], password=item['password'], parroquia_id=parish))
                assert response.status_code == 200, (item['role'], response.text)
                headers = {'Authorization': 'Bearer ' + response.json()['access_token']}
                me = client.get('/api/auth/me', headers=headers)
                assert me.status_code == 200 and me.json()['rol'] == item['role']
                assert not me.json()['debe_cambiar_password']
                tokens[item['role']] = headers
                for route in ['/api/registros/','/api/personas/','/api/sacramentos/','/api/parroquias/','/api/libros/','/api/solicitudes/','/api/certificados/','/api/documentos/','/api/reportes']:
                    r = client.get(route, headers=headers)
                    assert r.status_code == 200, (item['role'], route, r.text)
                results.append(dict(rol=item['role'], autenticacion='APROBADA', modulos_consulta=9))
            records = client.get('/api/registros/', headers=tokens['administrador']).json()
            own = next(r for r in records if r['parroquia_id'] == parishes[0]['id'])
            for role in ['auditor','consulta']:
                assert client.post('/api/certificados/', headers=tokens[role], json={'registro_id': own['id']}).status_code == 403
            certificate_results = []
            for curia in [False, True]:
                response = client.post('/api/certificados/', headers=tokens['secretario_parroquial'], json=dict(registro_id=own['id'], requiere_aprobacion_curia=curia, motivo_curia='Caso ficticio de validación' if curia else None))
                assert response.status_code == 201, response.text
                cert = response.json(); cid = cert['id']
                assert client.get(f'/api/certificados/{cid}/pdf', headers=tokens['administrador']).status_code == 409
                data = {'motivo': 'Prueba ficticia del paquete'}
                assert client.post(f'/api/certificados/{cid}/autorizar', headers=tokens['administrador'], json=data).status_code == 403
                assert client.post(f'/api/certificados/{cid}/autorizar', headers=tokens['parroco'], json=data).status_code == 200
                signer = 'parroco'
                if curia:
                    assert client.post(f'/api/certificados/{cid}/aprobar-curia', headers=tokens['canciller'], json=data).status_code == 200
                    signer = 'canciller'
                assert client.post(f'/api/certificados/{cid}/firmar', headers=tokens[signer], json=data).status_code == 200
                pdf = client.get(f'/api/certificados/{cid}/pdf', headers=tokens[signer])
                assert pdf.status_code == 200 and pdf.content.startswith(b'%PDF-'), pdf.text[:300] if not pdf.content.startswith(b'%PDF-') else ''
                (PUBLIC / ('certificado-curia.pdf' if curia else 'certificado-ordinario.pdf')).write_bytes(pdf.content)
                assert client.get('/api/certificados/verificar/' + cert['codigo_verificacion']).json()['valido']
                assert client.post(f'/api/certificados/{cid}/anular', headers=tokens[signer], json=data).status_code == 200
                assert not client.get('/api/certificados/verificar/' + cert['codigo_verificacion']).json()['valido']
                certificate_results.append(dict(curia=curia, preparar=True, autorizar=True, firmar=True, pdf=True, anular=True))
            assert client.get('/api/auditoria/', headers=tokens['auditor']).status_code == 200
            # Real application backup invokes the installed PostgreSQL pg_dump.
            response = client.post('/api/respaldos/', headers=tokens['administrador'])
            assert response.status_code == 202, response.text
            job = response.json()
            for _ in range(60):
                jobs = client.get('/api/respaldos/', headers=tokens['administrador']).json()
                backup = next(row for row in jobs if row['id'] == job['id'])
                if backup['estado'] != 'en_curso': break
                time.sleep(.5)
            assert backup['estado'] == 'completado', backup
            write('respaldo-aplicacion.json', dict(resultado=backup['estado'], tamano=backup['tamano'], sha256=backup['sha256']))
            write('certificados.json', certificate_results)
        duplicate = LAB / 'duplicate.json'
        run([executable, '--no-browser', '--result', duplicate])
        reused = json.loads(duplicate.read_text()); assert reused['pid'] == startup['pid'] and reused['estado'] == 'instancia_existente'
        write('ciclo-vida.json', dict(instancia_unica=True, backend_frontend_mismo_origen=True, enlace='127.0.0.1', puerto=startup['url'].rsplit(':',1)[1]))
        # Keep the packaged server running while screenshots are taken by capture.mjs.
        save('capture.dat', dict(url=startup['url'], pid=process.pid, exe=str(executable)))
        write('capture-url.json', dict(url=startup['url']))
        write('accesos-verificados.json', results)
        print('Ejecutable instalado, configurado y probado; disponible para capturas.', flush=True)
        if os.environ.get('SGD_KEEP_CAPTURE') == '1':
            return
    finally:
        if os.environ.get('SGD_KEEP_CAPTURE') != '1': stop(executable, process)
    engine.dispose()


if __name__ == '__main__':
    exercise()
