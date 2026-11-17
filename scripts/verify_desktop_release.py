"""Exercise a rebuilt/extracted portable EXE with a new disposable data profile."""
import argparse
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile
import time

import httpx
from release_complete import ROOT, WORK, APP


def main(app):
    app = app.resolve()
    if not app.is_relative_to(ROOT) or not (app / 'SGD_Tibu.exe').is_file():
        raise ValueError('Seleccione un ejecutable de evaluación dentro del proyecto')
    profile = Path(tempfile.mkdtemp(prefix='sgd31-', dir=ROOT / '.test-data'))
    evidence = WORK / ('desktop-' + profile.name)
    evidence.mkdir(parents=True)
    result = evidence / 'startup.json'
    env = {**os.environ, 'SGD_DATA_DIR': str(profile), 'PYTHONUTF8': '1',
           'PATH': str(Path(os.environ['WINDIR']) / 'System32')}
    env.pop('PYTHONHOME', None); env.pop('PYTHONPATH', None)
    exe = app / 'SGD_Tibu.exe'
    process = subprocess.Popen([str(exe), '--serve-only', '--no-browser', '--result', str(result)],
                               cwd=app, env=env, creationflags=subprocess.CREATE_NO_WINDOW)
    summary = {'version': '3.1.0', 'perfil_nuevo': True, 'herramientas_externas_en_path': False,
               'base_original_accedida': False, 'verificaciones': []}
    def check(name, condition):
        if not condition:
            raise AssertionError(name)
        summary['verificaciones'].append(name)
        print('APROBADA: ' + name, flush=True)
    try:
        deadline = time.monotonic() + 180
        while not result.exists() and time.monotonic() < deadline:
            if process.poll() is not None:
                raise RuntimeError('El ejecutable terminó antes de iniciar; consulte los registros del perfil nuevo')
            time.sleep(.2)
        state = json.loads(result.read_text(encoding='utf-8'))
        check('Inicio real del ejecutable con Python y PostgreSQL incluidos', state['estado'] == 'disponible')
        with httpx.Client(base_url=state['url'], trust_env=False, timeout=40) as client:
            def login(email='admin@iglesia.org', password='admin123', parish=None):
                response = client.post('/api/auth/login', json={'email': email, 'password': password, 'parroquia_id': parish})
                response.raise_for_status()
                return {'Authorization': 'Bearer ' + response.json()['access_token']}
            headers = login()
            parishes = client.get('/api/parroquias/', headers=headers).json()
            check('Catálogo aprobado y cero partidas iniciales', len(parishes) == 13 and client.get('/api/registros/', headers=headers).json() == [])
            endpoints = ['parroquias/', 'personas/', 'registros/', 'sacramentos/', 'libros/', 'solicitudes/',
                         'certificados/', 'documentos/', 'usuarios/', 'auditoria/', 'roles/', 'respaldos/', 'reportes']
            check('Trece módulos API del programa empaquetado', all(client.get('/api/' + path, headers=headers).status_code == 200 for path in endpoints))
            # Capture the actual bundled UI before adding synthetic test records.
            browser_env = {**os.environ, 'SGD_EVAL_URL': state['url'], 'SGD_CAPTURE_OUTPUT': str(evidence)}
            with (evidence / 'browser.log').open('wb') as log:
                browser = subprocess.run(['node', str(ROOT / 'desktop/capture_real.mjs')], env=browser_env,
                                         stdout=log, stderr=log, creationflags=subprocess.CREATE_NO_WINDOW)
            check('Login y navegación Playwright de la aplicación empaquetada', browser.returncode == 0)
            def post(path, data, auth=headers, status=201):
                response = client.post('/api/' + path, headers=auth, json=data)
                if response.status_code != status:
                    raise AssertionError('Respuesta inesperada en ' + path + ': ' + str(response.status_code))
                return response.json()
            a, b = parishes[0]['id'], parishes[1]['id']
            password = secrets.token_urlsafe(24)
            post('usuarios/', {'nombre': 'Párroco ficticio de verificación', 'email': 'parroco@example.org',
                              'password': password, 'rol': 'parroco', 'parroquia_id': a})
            priest = login('parroco@example.org', password, a)
            person = post('personas/', {'nombres': 'Persona ficticia', 'apellidos': 'Verificación del paquete', 'parroquia_id': a})
            spouse = post('personas/', {'nombres': 'Otra persona ficticia', 'apellidos': 'Verificación del paquete', 'parroquia_id': a})
            records = []
            for sacrament in client.get('/api/sacramentos/', headers=headers).json():
                post('libros/', {'parroquia_id': a, 'sacramento_id': sacrament['id'], 'numero': 'REVISION-31'})
                payload = {'persona_id': person['id'], 'sacramento_id': sacrament['id'], 'parroquia_id': a,
                           'fecha_celebracion': '2020-01-10', 'libro': 'REVISION-31', 'folio': '1',
                           'numero': str(sacrament['id']), 'datos': {'conyuge_persona_id': spouse['id']} if sacrament['nombre'] == 'Matrimonio' else {}}
                record = post('registros/', payload)
                changed = client.patch('/api/registros/' + str(record['id']), headers=headers,
                                       json={**payload, 'lugar': 'Lugar ficticio corregido', 'motivo': 'Prueba del ejecutable actualizado'})
                history = client.get('/api/registros/' + str(record['id']) + '/historial', headers=headers).json()
                check('Corrección e historial de ' + sacrament['nombre'], changed.status_code == 200 and history[0]['cambios'][0]['nuevo'] == 'Lugar ficticio corregido')
                records.append(record)
            sid = post('solicitudes/', {'registro_id': records[0]['id'], 'origen_id': b, 'motivo': 'Solicitud ficticia del paquete'})['id']
            post(f'solicitudes/{sid}/decision', {'estado': 'aprobada', 'motivo': 'Referencia ficticia comprobada'}, status=200)
            payload = {'registro_id': records[0]['id'], 'solicitud_id': sid}
            cert = post('certificados/', payload)
            again = post('certificados/', payload, status=200)
            check('Preparar desde solicitud conserva un único certificado', cert['id'] == again['id'] and again['reutilizado'])
            prefix = f"certificados/{cert['id']}"
            post(prefix + '/autorizar', {'motivo': 'Autorización ficticia del paquete'}, auth=priest, status=200)
            post(prefix + '/firmar', {'motivo': 'Firma ficticia del paquete'}, auth=priest, status=200)
            trace = client.get('/api/' + prefix + '/trazabilidad', headers=headers).json()
            check('Trazabilidad del paquete con preparación, autorización y firma', [event['estado'] for event in trace['eventos']] == ['preparado', 'autorizado', 'firmado'])
            pdf = client.get('/api/' + prefix + '/pdf', headers=headers)
            check('PDF firmado y verificación pública del paquete', pdf.status_code == 200 and pdf.content.startswith(b'%PDF') and client.get('/api/certificados/verificar/' + cert['codigo_verificacion']).json()['valido'])
            uploaded = client.post('/api/documentos/', headers=headers, params={'registro_id': records[0]['id'], 'tipo_documento': 'acta'},
                                   files={'archivo': ('verificacion-ficticia.pdf', pdf.content, 'application/pdf')})
            docs = client.get('/api/documentos/', headers=headers).json()
            check('Carga documental con referencia legible', uploaded.status_code == 201 and docs[0]['referencia']['libro'] == 'REVISION-31')
            client.post('/api/auth/logout', headers=headers).raise_for_status()
            check('Cerrar sesión revoca el acceso', client.get('/api/auth/me', headers=headers).status_code == 401)
        # Shut down through the same executable; all data stays in the new profile.
        subprocess.run([str(exe), '--stop', '--no-browser'], cwd=app, env=env, check=True,
                       timeout=90, creationflags=subprocess.CREATE_NO_WINDOW)
        process.wait(timeout=90)
        check('Cierre ordenado del PostgreSQL incluido', process.returncode == 0 and not (profile / 'postgresql-18/postmaster.pid').exists())
        summary['aprobado'] = True
        summary['aplicacion'] = str(app.relative_to(ROOT))
    finally:
        if process.poll() is None:
            subprocess.run([str(exe), '--stop', '--no-browser'], cwd=app, env=env,
                           timeout=90, creationflags=subprocess.CREATE_NO_WINDOW)
            process.wait(timeout=90)
        (evidence / 'resultado.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
    print('Evidencia: ' + str((evidence / 'resultado.json').relative_to(ROOT)))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--app-root', type=Path, default=APP)
    args = parser.parse_args()
    main(args.app_root)
