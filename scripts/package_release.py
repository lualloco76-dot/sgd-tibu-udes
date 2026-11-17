"""Package the current reviewed source and compiled UI; exclude private data."""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
TREES = ['backend/app', 'backend/migrations', 'backend/tests', 'frontend/src', 'frontend/public',
         'frontend/scripts', 'frontend/e2e', 'frontend/build', 'scripts', 'deploy', 'security',
         '.github', '.agents/skills', 'desktop', 'launcher', 'database', 'AUDITORIA_20261116',
         'ENTREGA_TECNICA_SGD_TIBU', 'design']
ROOT_FILES = ['README.md', 'FINAL_PENDIENTES_Y_RESULTADOS.md', '.gitignore', '.gitattributes', '.dockerignore', 'Dockerfile', 'render.yaml',
              'skills-lock.json', 'backend/requirements.txt', 'backend/requirements-dev.txt',
              'backend/alembic.ini', 'backend/ejecutar_schema.py', 'backend/crear_admin.py',
              'backend/actualizar_password.py', 'backend/.env.example', 'frontend/package.json',
              'frontend/package-lock.json', 'frontend/index.html', 'frontend/vite.config.mjs',
              'frontend/playwright.config.mjs', 'frontend/.env.example', 'iniciar.bat', 'iniciar_sistema.bat']


def source_files():
    result = {ROOT / name for name in ROOT_FILES if (ROOT / name).is_file()}
    result.update((ROOT / 'backend').glob('*.py'))
    for directory in TREES:
        for path in (ROOT / directory).rglob('*'):
            if not path.is_file():
                continue
            rel = path.relative_to(ROOT)
            if any(part in {'__pycache__', 'node_modules', 'venv', 'uploads', 'backups', 'evidencias-privadas'} for part in rel.parts):
                continue
            if path.name.startswith('.env') or path.suffix.lower() in {'.pyc', '.exe', '.dll', '.db', '.dump', '.zip', '.rar'}:
                continue
            result.add(path)
    return sorted(result)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', default='.test-artifacts/entrega/SGD_TIBU_CODIGO_VERIFICADO.zip')
    args = parser.parse_args()
    output = (ROOT / args.output).resolve()
    if not output.is_relative_to(ROOT):
        raise ValueError('La entrega debe guardarse dentro del proyecto')
    output.parent.mkdir(parents=True, exist_ok=True)
    files = source_files()
    manifest = {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
    digest = hashlib.sha256(json.dumps(manifest, sort_keys=True).encode()).hexdigest()
    with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
        for path in files:
            archive.write(path, path.relative_to(ROOT).as_posix())
        archive.writestr('MANIFIESTO_SHA256.json', json.dumps({'source_digest': digest, 'files': manifest}, indent=2))
    checksum = hashlib.sha256(output.read_bytes()).hexdigest()
    output.with_suffix(output.suffix + '.sha256').write_text(checksum + '  ' + output.name + '\n')
    print(json.dumps({'archive': str(output.relative_to(ROOT)), 'files': len(files),
                      'source_digest': digest, 'zip_sha256': checksum}))


if __name__ == '__main__':
    main()
