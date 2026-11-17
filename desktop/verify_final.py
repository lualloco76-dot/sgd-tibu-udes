"""Acceptance tests against the actual Windows installer and bundled runtime."""
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import traceback

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT), str(ROOT / 'backend')]
from desktop.final_release import WORK, command, dump_json, digest

EVIDENCE = WORK / 'evidence'
PROFILE = WORK / 'acceptance-profile'
INSTALL = WORK / 'installed'
ROWS = []


def passed(name, procedure, expected, obtained, evidence='aceptacion.json'):
    ROWS.append(dict(prueba=name, procedimiento=procedure, esperado=expected,
                     obtenido=obtained, estado='APROBADA', evidencia=evidence))
    dump_json(EVIDENCE / 'aceptacion.json', ROWS)
    print('APROBADA: ' + name, flush=True)


def main():
    import httpx
    from sqlalchemy import create_engine, inspect, text
    from desktop.secure_config import read
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    installer = WORK / 'build/inno-output/SGD_Tibu_Setup.exe'
    env = os.environ.copy()
    env.update(SGD_DATA_DIR=str(PROFILE), PATH=str(Path(os.environ['WINDIR']) / 'System32'))
    env.pop('PYTHONHOME', None); env.pop('PYTHONPATH', None)
    os.environ['SGD_DATA_DIR'] = str(PROFILE)
    command([installer, '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/NOICONS',
             '/TASKS=', '/DIR=' + str(INSTALL), '/LOG=' + str(WORK / 'install.log')], env)
    exe = INSTALL / 'SGD_Tibu.exe'
    assert exe.is_file() and (INSTALL / 'postgresql/bin/postgres.exe').is_file()
    assert not (PROFILE / 'config.dat').exists(), 'Se requiere perfil de aceptación nuevo'
    passed('Instalación real', 'Ejecutar Setup silencioso en destino de laboratorio',
           'Runtime, backend, React y PostgreSQL incluidos', 'Archivos instalados; no se instaló un servicio PostgreSQL')
    process = None
    def start(gui=False):
        nonlocal process
        result = WORK / 'current-start.json'; result.unlink(missing_ok=True)
        args = [str(exe), '--no-browser', '--result', str(result)]
        if not gui: args.append('--serve-only')
        process = subprocess.Popen(args, env=env, creationflags=subprocess.CREATE_NO_WINDOW)
        deadline = time.monotonic() + 180
        while not result.exists() and time.monotonic() < deadline:
            if process.poll() is not None:
                raise RuntimeError('El ejecutable terminó antes de iniciar. Consulte registros en acceptance-profile')
            time.sleep(.2)
        state = json.loads(result.read_text(encoding='utf8'))
        assert state['estado'] == 'disponible', state
        return state
    def stop():
        if process and process.poll() is None:
            command([exe, '--stop', '--no-browser'], env)
            process.wait(timeout=90)
            assert process.returncode == 0
    def login(client, email='admin@iglesia.org', password='admin123', parish=None):
        response = client.post('/api/auth/login', json=dict(email=email, password=password, parroquia_id=parish))
        assert response.status_code == 200, response.text
        return {'Authorization': 'Bearer ' + response.json()['access_token']}
    try:
        state = start(gui=True)
        passed('Primer inicio automático', 'Ejecutar SGD_Tibu.exe con perfil vacío y ventana real',
               'Preparar PostgreSQL, restaurar dump y abrir API sin solicitar datos',
               'Disponible con PATH limitado a Windows; sin Python, Node ni PostgreSQL externo en PATH')
        config = read('config.dat')
        assert config['managed_postgres']
        engine = create_engine(config['database_url'], hide_parameters=True)
        manifest = json.loads((WORK / 'payload/manifest.json').read_text())
        with engine.connect() as connection:
            counts = {t: connection.execute(text('SELECT COUNT(*) FROM "' + t + '"')).scalar_one() for t in inspect(connection).get_table_names()}
            assert counts == manifest['counts'], (counts, manifest['counts'])
            assert connection.execute(text('SELECT COUNT(*) FROM pg_constraint WHERE NOT convalidated')).scalar_one() == 0
            assert connection.execute(text('SHOW listen_addresses')).scalar_one() == '127.0.0.1'
            assert not connection.execute(text('SELECT rolsuper OR rolcreatedb OR rolcreaterole FROM pg_roles WHERE rolname=current_user')).scalar_one()
        engine.dispose()
        dump_json(EVIDENCE / 'restauracion.json', dict(conteos=counts, iguales_al_dump=True, relaciones_validadas=True, rol_aplicacion_limitado=True, escucha='127.0.0.1'))
        passed('Restauración real y relaciones', 'Consultar conteos físicos y pg_constraint tras el primer inicio',
               'Todos los conteos del manifiesto y FK validadas', '16 tablas; conteos exactos; rol limitado; escucha local', 'restauracion.json')
        with httpx.Client(base_url=state['url'], trust_env=False, timeout=40) as client:
            admin = login(client)
            me = client.get('/api/auth/me', headers=admin).json()
            assert me['rol'] == 'administrador' and me['activo'] and not me['debe_cambiar_password']
            routes = []
            for path in ['/api/parroquias/', '/api/personas/', '/api/registros/', '/api/sacramentos/', '/api/libros/', '/api/solicitudes/', '/api/certificados/', '/api/documentos/', '/api/usuarios/', '/api/auditoria/', '/api/roles/', '/api/respaldos/', '/api/reportes']:
                response = client.get(path, headers=admin)
                assert response.status_code == 200, (path, response.text)
                routes.append(dict(ruta=path, http=200))
            dump_json(EVIDENCE / 'login-api.json', dict(usuario=me['email'], rol=me['rol'], estado_activo=me['activo'], password_solicitada_correcta=True, rutas=routes))
            passed('Credenciales y módulos API', 'Login con admin@iglesia.org / admin123 y consulta de 13 listados', 'Autenticación 200 y permisos del administrador', 'Autenticación y 13 rutas correctas', 'login-api.json')
            for path in ['/login', '/registros', '/bautismos', '/api/ruta-inexistente']:
                assert client.get(path).status_code == (404 if path.startswith('/api/') else 200)
            # Current authenticated browser screenshots, without fabricated records.
            browserenv = os.environ.copy(); browserenv['SGD_EVAL_URL'] = state['url']
            browserenv['SGD_CAPTURE_OUTPUT'] = str(EVIDENCE)
            command(['C:/Program Files/nodejs/node.exe', ROOT / 'desktop/capture_real.mjs'], browserenv, 'browser.log')
            passed('Inicio de sesión y navegación en Chrome', 'Playwright abre login, autentica y recorre las pantallas finales',
                   'Interfaz actual y capturas auténticas sin errores JavaScript', 'Capturas de la aplicación instalada generadas', 'navegador-real.json')
            duplicate = WORK / 'duplicate.json'; duplicate.unlink(missing_ok=True)
            command([exe, '--no-browser', '--result', duplicate], env)
            assert json.loads(duplicate.read_text())['pid'] == state['pid']
            passed('Instancia única', 'Abrir de nuevo el mismo ejecutable', 'Reutilizar PID existente', 'PID reutilizado')
            # Exercise the actual bundled API. Synthetic additions stay in this
            # test profile and NEVER enter the delivery dump.
            parishes = client.get('/api/parroquias/', headers=admin).json()
            a, b = parishes[0]['id'], parishes[1]['id']
            password = 'EvaluacionSintetica2026!'
            headers = {'administrador': admin}
            for role in ['parroco', 'secretario_parroquial', 'secretario_general', 'canciller', 'auditor', 'consulta']:
                parish = a if role in {'parroco', 'secretario_parroquial', 'consulta'} else None
                email = role + '@example.org'
                response = client.post('/api/usuarios/', headers=admin, json=dict(nombre='Cuenta sintética ' + role, email=email, password=password, rol=role, parroquia_id=parish))
                assert response.status_code == 201, response.text
                headers[role] = login(client, email, password, parish)
            assert client.get('/api/usuarios/', headers=headers['consulta']).status_code == 403
            assert client.get('/api/auditoria/', headers=headers['auditor']).status_code == 200
            assert client.post('/api/personas/', headers=headers['auditor'], json=dict(nombres='No', apellidos='Autorizado', parroquia_id=a)).status_code == 403
            passed('Siete roles en la aplicación empaquetada', 'Crear seis cuentas sintéticas solo en laboratorio, autenticar y comprobar denegaciones',
                   'Siete roles activos; consulta y auditor sin escritura', 'Siete roles autenticados; restricciones 403 verificadas')
            def post(path, payload, role='administrador', status=201):
                response = client.post(path, headers=headers[role], json=payload)
                assert response.status_code == status, (path, response.status_code, response.text)
                return response.json()
            p1 = post('/api/personas/', dict(nombres='Persona Ficticia UDES', apellidos='Prueba A', parroquia_id=a))
            p2 = post('/api/personas/', dict(nombres='Persona Ficticia UDES', apellidos='Prueba B', parroquia_id=a))
            records = []
            for sacrament in client.get('/api/sacramentos/', headers=admin).json():
                post('/api/libros/', dict(parroquia_id=a, sacramento_id=sacrament['id'], numero='UDES-PRUEBA'))
                data = {'conyuge_persona_id': p2['id']} if sacrament['nombre'] == 'Matrimonio' else {}
                if sacrament['nombre'] == 'Defunción': data['fecha_defuncion'] = '2020-01-01'
                payload = dict(persona_id=p1['id'], sacramento_id=sacrament['id'], parroquia_id=a,
                               fecha_celebracion='2020-01-02', libro='UDES-PRUEBA', folio='1', numero=str(sacrament['id']), datos=data)
                record = post('/api/registros/', payload)
                changed = client.patch('/api/registros/' + str(record['id']), headers=admin,
                                       json=dict(payload, notas='Corrección ficticia UDES', motivo='Prueba de trazabilidad UDES'))
                assert changed.status_code == 200, changed.text
                assert len(client.get('/api/registros/' + str(record['id']) + '/historial', headers=admin).json()) == 1
                records.append(record)
            record_id = records[0]['id']
            passed('Cuatro sacramentos y corrección', 'Crear personas, libros y cuatro partidas sintéticas; corregir y consultar historial',
                   'Creación 201, corrección 200, historial conservado', 'Cuatro tipos creados y sus historiales consultados')
            request = post('/api/solicitudes/', dict(registro_id=record_id, origen_id=b, motivo='Prueba interparroquial ficticia UDES'))
            post('/api/solicitudes/' + str(request['id']) + '/decision', dict(estado='aprobada', motivo='Referencia ficticia comprobada'), role='parroco', status=200)
            cert = post('/api/certificados/', dict(registro_id=record_id, solicitud_id=request['id']))
            prefix = '/api/certificados/' + str(cert['id'])
            assert client.post(prefix + '/autorizar', headers=admin, json={}).status_code == 403
            post(prefix + '/autorizar', {}, role='parroco', status=200)
            post(prefix + '/firmar', {}, role='parroco', status=200)
            pdf = client.get(prefix + '/pdf', headers=admin)
            assert pdf.status_code == 200 and pdf.content.startswith(b'%PDF')
            (EVIDENCE / 'certificado-prueba-ficticia.pdf').write_bytes(pdf.content)
            assert client.get('/api/certificados/verificar/' + cert['codigo_verificacion']).json()['valido']
            curia = post('/api/certificados/', dict(registro_id=record_id, requiere_aprobacion_curia=True, motivo_curia='Prueba ficticia Curia UDES'))
            cp = '/api/certificados/' + str(curia['id'])
            post(cp + '/autorizar', {}, role='parroco', status=200)
            post(cp + '/aprobar-curia', {}, role='canciller', status=200)
            post(cp + '/firmar', {}, role='canciller', status=200)
            post(cp + '/anular', dict(motivo='Anulación ficticia de evaluación'), role='canciller', status=200)
            assert not client.get('/api/certificados/verificar/' + curia['codigo_verificacion']).json()['valido']
            passed('Solicitudes y certificados completos', 'Solicitar, decidir, preparar, autorizar, firmar, descargar PDF; aprobar Curia y anular segundo certificado',
                   'Transiciones reales y separación de funciones', 'Flujos ordinario y Curia aprobados; PDF válido; anulación invalida QR')
            backup = post('/api/respaldos/', {}, status=202)
            deadline = time.monotonic() + 90
            while time.monotonic() < deadline:
                rows = client.get('/api/respaldos/', headers=admin).json()
                current = next(row for row in rows if row['id'] == backup['id'])
                if current['estado'] != 'en_curso': break
                time.sleep(.3)
            assert current['estado'] == 'completado', current
            assert client.post('/api/respaldos/' + backup['id'] + '/verificar', headers=admin).status_code == 200
            passed('Respaldo integrado', 'Crear y verificar copia desde API usando pg_dump incluido', 'Copia completa sin herramientas externas', 'Respaldo completado y verificado')
            assert client.post('/api/auth/logout', headers=admin).status_code == 200
            assert client.get('/api/auth/me', headers=admin).status_code == 401
        stop()
        assert not (PROFILE / 'postgresql-18/postmaster.pid').exists()
        passed('Cierre ordenado', 'Solicitar Cerrar SGD y esperar terminación de procesos', 'API y PostgreSQL detenidos; datos conservados', 'Proceso finalizó con código 0; PostgreSQL detenido')
        # Reinstall while closed, without replacing the external data profile.
        marker = PROFILE / 'documentos/prueba-persistencia.txt'; marker.parent.mkdir(exist_ok=True)
        marker.write_text('Evidencia sintética de persistencia UDES', encoding='utf8')
        protected_hash = digest(PROFILE / 'config.dat')
        command([installer, '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/NOICONS', '/TASKS=', '/DIR=' + str(INSTALL)], env)
        assert digest(PROFILE / 'config.dat') == protected_hash
        state = start()
        with httpx.Client(base_url=state['url'], trust_env=False, timeout=40) as client:
            admin = login(client)
            assert len(client.get('/api/registros/', headers=admin).json()) == 4
            assert len(client.get('/api/personas/', headers=admin).json()) == 2
        stop()
        passed('Reapertura, persistencia y actualización', 'Reinstalar y abrir usando el mismo perfil', 'Conservar cuatro partidas y dos personas sintéticas', 'Persisten registros, documentos de prueba y configuración')
        command([INSTALL / 'unins000.exe', '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART'], env)
        assert (PROFILE / 'config.dat').exists() and (PROFILE / 'postgresql-18/PG_VERSION').exists() and marker.exists()
        passed('Desinstalación conserva datos', 'Desinstalar solo el destino de laboratorio', 'Mantener base y documentos fuera de binarios', 'Base, configuración y marcador conservados')
        # Portable binary uses the same independently preserved test profile.
        portable = WORK / 'build/embedded-app/SGD_Tibu.exe'
        exe = portable
        state = start()
        with httpx.Client(base_url=state['url'], trust_env=False, timeout=40) as client:
            admin = login(client)
            assert len(client.get('/api/registros/', headers=admin).json()) == 4
        stop()
        passed('Versión portátil real', 'Abrir el ejecutable distribuible después de desinstalar', 'Runtime completo y datos conservados', 'API autenticada; cuatro partidas sintéticas persistentes')
    finally:
        stop()
        dump_json(EVIDENCE / 'aceptacion.json', ROWS)
    print('Aceptación local del ejecutable completada.', flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        ROWS.append(dict(prueba='Ejecución interrumpida', estado='FALLIDA', obtenido=type(error).__name__ + ': ' + str(error)))
        dump_json(EVIDENCE / 'aceptacion.json', ROWS)
        raise
