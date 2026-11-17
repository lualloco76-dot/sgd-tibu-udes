"""Remove test passwords and bearer tokens before sharing QA evidence."""
import io
import json
import os
from pathlib import Path
import re
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
passwords = [os.getenv('QA_PASSWORD', ''), os.getenv('SECRET_KEY', '')]
private = ROOT / '.test-data/qa/runtime.json'
if private.is_file():
    values = json.loads(private.read_text(encoding='utf-8'))
    passwords += [values.get('QA_PASSWORD', ''), values.get('SECRET_KEY', '')]


def scrub(data):
    try:
        value = data.decode('utf-8')
    except UnicodeDecodeError:
        return data
    for password in filter(None, passwords):
        value = value.replace(password, '[REDACTADO]')
    value = re.sub(r'eyJ[\w-]+\.[\w-]+\.[\w-]+', '[JWT REDACTADO]', value)
    value = re.sub(r'''(["'](?:password|actual|nueva)["']\s*:\s*["'])[^"']+''',
                   r'\1[REDACTADO]', value)
    return value.encode('utf-8')


def clean(path):
    if path.suffix == '.zip':
        output = io.BytesIO()
        with ZipFile(path) as source, ZipFile(output, 'w', ZIP_DEFLATED) as target:
            for info in source.infolist():
                target.writestr(info, scrub(source.read(info)))
        path.write_bytes(output.getvalue())
    else:
        path.write_bytes(scrub(path.read_bytes()))


targets = [ROOT / '.test-artifacts' / n for n in ['playwright', 'qa-inicial', 'qa-cli', 'buttons-before', 'buttons-cli']]
targets += [ROOT / 'frontend/.playwright-cli']
paths = [p for directory in targets if directory.is_dir() for p in directory.rglob('*') if p.is_file()]
paths += list((ROOT / '.test-artifacts').glob('regresiones-*.xml'))
for path in paths:
    clean(path)
print(f'Evidencias saneadas: {len(paths)} archivos. No se modifica la configuración privada.')
