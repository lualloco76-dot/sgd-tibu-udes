"""Build and package an updated Windows release without touching prior deliveries.

Uses the already approved, anonymized evaluation dump. Never reads backend/.env.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from zipfile import ZipFile, ZIP_DEFLATED

from package_release import ROOT, source_files

WORK = ROOT / '.test-artifacts/continuacion-20261116'
BUILD = Path(os.environ.get('SGD_RELEASE_BUILD_DIR', str(WORK / 'build-final'))).resolve()
if not BUILD.is_relative_to(ROOT):
    raise ValueError('La construcción debe permanecer dentro del proyecto')
PAYLOAD = WORK / 'payload'
APP = BUILD / 'embedded-app'
OUTPUT = ROOT / 'SGD_TIBU_ACTUALIZADO_20261116.zip'
VERSION = '3.1.0'


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def build():
    previous = Path(os.environ.get('SGD_APPROVED_PAYLOAD', str(ROOT / '.test-artifacts/final-udes-20261109/payload')))
    manifest = json.loads((previous / 'manifest.json').read_text(encoding='utf-8'))
    if not manifest.get('anonymized') or sha(previous / manifest['snapshot_file']) != manifest['snapshot_sha256']:
        raise ValueError('La copia de evaluación aprobada no superó la verificación')
    PAYLOAD.mkdir(parents=True, exist_ok=True)
    shutil.copy2(previous / manifest['snapshot_file'], PAYLOAD / manifest['snapshot_file'])
    manifest['version'] = VERSION
    manifest['code_revision'] = '2026-11-16'
    (PAYLOAD / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    tools = BUILD / 'toolchain'
    tools.mkdir(parents=True, exist_ok=True)
    source = Path(os.environ.get('SGD_TOOLCHAIN_DIR', str(ROOT / '.test-artifacts/distribution/toolchain')))
    shutil.copy2(source / 'python-embed.zip', tools / 'python-embed.zip')
    shutil.copytree(source / 'Inno', tools / 'Inno', dirs_exist_ok=True)
    env = {**os.environ, 'SGD_BUILD_DIR': str(BUILD), 'SGD_PAYLOAD_DIR': str(PAYLOAD),
           'SGD_RELEASE_VERSION': VERSION, 'PYTHONUTF8': '1'}
    with (WORK / 'build.log').open('wb') as log:
        result = subprocess.run([sys.executable, str(ROOT / 'desktop/build.py')], env=env, cwd=ROOT,
                                stdout=log, stderr=log, creationflags=subprocess.CREATE_NO_WINDOW)
    if result.returncode:
        raise RuntimeError('La compilación falló; consulte .test-artifacts/continuacion-20261116/build.log')
    print('Programa e instalador 3.1.0 reconstruidos en una carpeta nueva.')


def package():
    if not (APP / 'SGD_Tibu.exe').is_file():
        raise ValueError('Ejecute build antes de empaquetar')
    frontend = json.loads((ROOT / '.test-artifacts/buttons-frontend.json').read_text(encoding='utf-8'))
    browser = json.loads((ROOT / '.test-artifacts/playwright/results.json').read_text(encoding='utf-8'))
    suites = ET.parse(ROOT / '.test-artifacts/qa-backend.xml').getroot().iter('testsuite')
    if frontend['numFailedTests'] or browser['stats']['unexpected'] or browser['stats']['expected'] < 50:
        raise ValueError('Las pruebas de interfaz y navegador deben cerrar sin fallos antes de empaquetar')
    if any(int(s.attrib.get('failures', 0)) or int(s.attrib.get('errors', 0)) for s in suites):
        raise ValueError('Las pruebas del backend deben cerrar sin fallos antes de empaquetar')
    for directory in ['backend/app', 'backend/migrations', 'frontend/build']:
        for path in (ROOT / directory).rglob('*'):
            if path.is_file() and '__pycache__' not in path.parts and path.suffix != '.pyc':
                target = APP / path.relative_to(ROOT)
                if not target.is_file() or sha(path) != sha(target):
                    raise ValueError('La construcción no coincide con el código actual: ' + str(path.relative_to(ROOT)))
    report = (ROOT / 'AUDITORIA_20261116/REVISION_FUNCIONAL.md').read_text(encoding='utf-8')
    if 'Pendiente de incorporar' in report:
        raise ValueError('Incorpore los resultados al informe antes de empaquetar')
    files = {'01_PROGRAMA/' + path.relative_to(APP).as_posix(): path for path in APP.rglob('*')
             if path.is_file() and '__pycache__' not in path.parts and path.suffix != '.pyc'}
    files['02_INSTALADOR/SGD_Tibu_Setup.exe'] = BUILD / 'inno-output/SGD_Tibu_Setup.exe'
    files.update({'03_CODIGO_FUENTE/' + path.relative_to(ROOT).as_posix(): path for path in source_files()})
    for name in ['REVISION_FUNCIONAL.md', 'REPRODUCIR.md', 'INFORME.md']:
        files['04_DOCUMENTACION/' + name] = ROOT / 'AUDITORIA_20261116' / name
    guide = WORK / 'LEEME_PRIMERO.md'
    guide.write_text('''# SGD Tibú actualizado · 16 de noviembre de 2026

Versión 3.1.0. Este paquete reemplaza el código y los binarios de la edición anterior.
Conserve el ZIP anterior como respaldo. No se publicó en GitHub, Render ni Neon.

1. Extraiga TODO el ZIP en una carpeta corta, por ejemplo C:\\SGD31.
2. Abra 01_PROGRAMA/SGD_Tibu.exe. También puede instalar con
   02_INSTALADOR/SGD_Tibu_Setup.exe. Cierre la edición anterior antes de actualizar.
3. En un perfil nuevo se prepara una base local independiente con el catálogo
   aprobado de 13 parroquias; no lleva partidas ficticias de las pruebas.
4. Acceso de evaluación local: admin@iglesia.org / admin123.
   Seleccione Acceso diocesano / administración.
5. Para conservar datos de una instalación anterior del mismo usuario Windows,
   use su perfil habitual; no borre la carpeta de datos del usuario.

La cuenta anterior solo sirve para evaluación local. La aplicación escucha en
127.0.0.1. No necesita Python, Node ni un PostgreSQL externo para abrir el programa.
Los datos del usuario permanecen en %LOCALAPPDATA%\\SGD Tibu UDES\\datos.

En Certificados y Gestión documental, busque la partida por persona o número
y selecciónela por libro, folio y partida. Para una solicitud interparroquial,
apruebe desde la custodia, pulse Preparar certificado y luego Continuar certificado.
Ver trazabilidad presenta responsables, fechas y actuaciones. Las correcciones
de partidas requieren un motivo y aparecen en Historial.

Consulte 04_DOCUMENTACION/REVISION_FUNCIONAL.md para resultados y límites.
03_CODIGO_FUENTE incluye la fuente, las pruebas y los manuales técnicos.
MANIFIESTO_SHA256.json permite verificar cada archivo del paquete.
''', encoding='utf-8')
    files['LEEME_PRIMERO.md'] = guide
    manifest = {name: sha(path) for name, path in sorted(files.items())}
    with ZipFile(OUTPUT, 'w', ZIP_DEFLATED) as archive:
        for name, path in sorted(files.items()):
            archive.write(path, name)
        archive.writestr('MANIFIESTO_SHA256.json', json.dumps(manifest, indent=2))
    OUTPUT.with_suffix('.zip.sha256').write_text(sha(OUTPUT) + '  ' + OUTPUT.name + '\n', encoding='ascii')
    print(json.dumps({'archivo': OUTPUT.name, 'archivos': len(files), 'bytes': OUTPUT.stat().st_size,
                      'sha256': sha(OUTPUT)}))


def verify():
    # Use a new extraction directory; never remove or overwrite an earlier run.
    import tempfile
    destination = Path(tempfile.mkdtemp(prefix='sgd31-', dir=ROOT / '.test-artifacts'))
    with ZipFile(OUTPUT) as archive:
        if archive.testzip() is not None:
            raise ValueError('El ZIP no superó la comprobación CRC')
        manifest = json.loads(archive.read('MANIFIESTO_SHA256.json'))
        if len(manifest) != len(archive.namelist()) - 1:
            raise ValueError('El manifiesto no coincide con el contenido')
        for info in archive.infolist():
            if not (destination / info.filename).resolve().is_relative_to(destination):
                raise ValueError('Ruta de archivo no permitida')
        archive.extractall(destination)
    for name, expected in manifest.items():
        if sha(destination / name) != expected:
            raise ValueError('Hash incorrecto: ' + name)
    result = {'archivo': OUTPUT.name, 'crc': True, 'extraccion_real': True,
              'sha256_todos_los_archivos': True, 'archivos_verificados': len(manifest),
              'destino_extraccion': str(destination.relative_to(ROOT)), 'zip_sha256': sha(OUTPUT)}
    (ROOT / 'SGD_TIBU_ACTUALIZADO_20261116_VERIFICACION.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['build', 'package', 'verify'])
    args = parser.parse_args()
    {'build': build, 'package': package, 'verify': verify}[args.command]()
