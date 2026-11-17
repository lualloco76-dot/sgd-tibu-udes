"""Build from official embedded Python and Inno Setup; no end-user build tools."""
import hashlib
import importlib.metadata as md
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import zipfile
from packaging.requirements import Requirement
from packaging.utils import canonicalize_name

ROOT = Path(__file__).resolve().parents[1]
BUILD = Path(os.environ.get('SGD_BUILD_DIR', str(ROOT / '.test-artifacts' / 'distribution'))).resolve()
APP = BUILD / 'embedded-app'


def run(args, **kwargs):
    subprocess.run(list(map(str, args)), check=True, **kwargs)


def lock_runtime():
    pending = [Requirement(line.strip()).name for line in (ROOT / 'backend/requirements.txt').read_text().splitlines() if line.strip() and not line.lstrip().startswith('#')] + ['Pillow']
    closure = {}
    while pending:
        name = canonicalize_name(pending.pop())
        if name in closure: continue
        package = md.distribution(name)
        closure[name] = name + '==' + package.version
        for entry in package.requires or []:
            requirement = Requirement(entry)
            if not requirement.marker or requirement.marker.evaluate({'extra': ''}):
                pending.append(requirement.name)
    path = ROOT / 'desktop/requirements-runtime.lock'
    path.write_text('\n'.join(closure[key] for key in sorted(closure)) + '\n', encoding='utf8')
    return path


def main():
    if os.name != 'nt' or sys.version_info[:2] != (3, 12) or sys.prefix == sys.base_prefix:
        raise RuntimeError('Compile con Windows x64 y un entorno virtual Python 3.12 aislado')
    if 'include-system-site-packages = true' in (Path(sys.prefix) / 'pyvenv.cfg').read_text():
        raise RuntimeError('No use librerías globales en la compilación')
    BUILD.mkdir(parents=True, exist_ok=True)
    env = os.environ.copy(); env.update(VITE_API_URL='/api', REACT_APP_API_URL='/api')
    run(['npm.cmd', 'run', 'build'], cwd=ROOT / 'frontend', env=env)
    runtime = APP / 'runtime'; runtime.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(BUILD / 'toolchain/python-embed.zip') as archive:
        archive.extractall(runtime)
    (runtime / 'python312._pth').write_text('python312.zip\n.\nLib\nLib/site-packages\n..\nimport site\n', encoding='ascii')
    base = Path(sys.base_prefix)
    for name in ['_tkinter.pyd', 'tcl86t.dll', 'tk86t.dll', 'zlib1.dll']:
        shutil.copy2(base / 'DLLs' / name, runtime / name)
    shutil.copytree(base / 'Lib/tkinter', runtime / 'Lib/tkinter', dirs_exist_ok=True, ignore=shutil.ignore_patterns('__pycache__', 'test'))
    shutil.copytree(base / 'tcl', runtime / 'tcl', dirs_exist_ok=True, ignore=shutil.ignore_patterns('*.lib', '*.sh', 'nmake'))
    locked = lock_runtime()
    deps = runtime / 'Lib/site-packages'
    marker = runtime / 'dependencies.sha256'
    digest = hashlib.sha256(locked.read_bytes()).hexdigest()
    if not marker.exists() or marker.read_text() != digest:
        if deps.exists():
            raise RuntimeError('Cambió el bloqueo de dependencias. Prepare una carpeta embedded-app nueva antes de recompilar')
        # Copy the exact installed wheels' files from this isolated build venv.
        # This makes offline reconstruction possible without network resolution.
        deps.mkdir(parents=True, exist_ok=True)
        for line in locked.read_text().splitlines():
            distribution = md.distribution(line.split('==')[0])
            for entry in distribution.files or []:
                target = (deps / str(entry)).resolve()
                if not target.is_relative_to(deps.resolve()) or target.suffix == '.pyc':
                    continue
                source = Path(distribution.locate_file(entry))
                if source.is_file():
                    target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source, target)
        marker.write_text(digest)
    desktop_target = (APP / 'desktop').resolve()
    if not desktop_target.is_relative_to(BUILD.resolve()) or desktop_target != (BUILD / 'embedded-app/desktop').resolve():
        raise RuntimeError('Destino de distribución inesperado')
    if desktop_target.exists():
        shutil.rmtree(desktop_target)
    desktop_target.mkdir()
    for name in ['__init__.py', 'runtime.py', 'secure_config.py', 'provision.py', 'local_postgres.py']:
        shutil.copy2(ROOT / 'desktop' / name, APP / 'desktop' / name)
    old_accounts = APP / 'desktop/demo_accounts.json'
    if old_accounts.exists():
        old_accounts.unlink()
    resources = Path(os.environ.get('SGD_PAYLOAD_DIR', str(ROOT / '.test-artifacts/evaluadores-real/payload')))
    if not (resources / 'manifest.json').is_file():
        raise RuntimeError('Prepare primero el respaldo real de la entrega de evaluadores')
    shutil.copytree(resources, APP / 'desktop/resources', dirs_exist_ok=True)
    frontend_target = (APP / 'frontend/build').resolve()
    if not frontend_target.is_relative_to(BUILD.resolve()) or frontend_target != (BUILD / 'embedded-app/frontend/build').resolve():
        raise RuntimeError('Destino de compilación inesperado')
    if frontend_target.exists():
        shutil.rmtree(frontend_target)
    for name in ['backend/app', 'backend/migrations', 'frontend/build']:
        shutil.copytree(ROOT / name, APP / name, dirs_exist_ok=True,
                        ignore=shutil.ignore_patterns('__pycache__', '*.pyc', 'tests', '*.cs', '*.iss', '*.lock', 'requirements*', 'build.py', 'validate.py', 'deliver.py', 'capture.mjs', 'recovery.py', 'window_capture.py'))
    (APP / 'launcher').mkdir(exist_ok=True)
    shutil.copy2(ROOT / 'launcher/launcher.ico', APP / 'launcher/launcher.ico')
    # Copy binaries only: never include any cluster, installed service or pgAdmin.
    postgres = Path(os.environ.get('SGD_POSTGRES_BINARIES', 'C:/Program Files/PostgreSQL/18'))
    for folder in ['bin', 'lib', 'share']:
        shutil.copytree(postgres / folder, APP / 'postgresql' / folder, dirs_exist_ok=True)
    for name in ['server_license.txt', 'commandlinetools_3rd_party_licenses.txt']:
        shutil.copy2(postgres / name, APP / 'postgresql' / name)
    compiler = Path(os.environ['WINDIR']) / 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
    run([compiler, '/nologo', '/target:winexe', '/platform:x64', '/optimize+', '/reference:System.Windows.Forms.dll',
         '/win32icon:' + str(ROOT / 'launcher/launcher.ico'), '/out:' + str(APP / 'SGD_Tibu.exe'), ROOT / 'desktop/Launcher.cs'])
    manifest = {path.relative_to(APP).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest() for path in APP.rglob('*') if path.is_file() and path != APP / 'MANIFIESTO_SHA256.json'}
    (APP / 'MANIFIESTO_SHA256.json').write_text(json.dumps(manifest, indent=2), encoding='utf8')
    output = BUILD / 'inno-output'
    run([BUILD / 'toolchain/Inno/ISCC.exe', '/DAppSource=' + str(APP), '/DOutputPath=' + str(output),
         '/DReleaseVersion=' + os.environ.get('SGD_RELEASE_VERSION', '3.0.0'), ROOT / 'desktop/installer.iss'])
    print('Instalador generado con Python oficial e Inno Setup:', output / 'SGD_Tibu_Setup.exe')


if __name__ == '__main__':
    main()
