"""Collect only the sanitized evidence produced by this review, not old archives."""
import hashlib
import json
from pathlib import Path
import shutil
import xml.etree.ElementTree as ET
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / '.test-artifacts'
DEST = ROOT / 'AUDITORIA_20261116/evidencias'
DEST.mkdir(parents=True, exist_ok=True)

names = ['qa-backend.xml', 'qa-regresiones-final.xml', 'regresiones-antes.xml', 'regresiones-despues.xml',
         'buttons-frontend.json', 'playwright-antes-selector.json',
         'qa-persistence.json', 'strix-preflight.json', 'npm-audit.json', 'pip-audit.json',
         'pip-audit-despues.json', 'runtime-audit.json', 'requirements-audit-final.json',
         'bandit-inicial.json', 'bandit-final.json', 'render-validation.json']
for name in names:
    if (ART / name).is_file():
        shutil.copyfile(ART / name, DEST / name)
shutil.copyfile(ART / 'playwright/results.json', DEST / 'playwright-final.json')
buttons = ART / 'buttons-cli'
if (buttons / 'inventario.json').is_file():
    button_dest = DEST / 'botones'
    button_dest.mkdir(exist_ok=True)
    for path in buttons.iterdir():
        if path.is_file() and path.suffix in {'.png', '.log', '.json'}:
            shutil.copyfile(path, button_dest / path.name)
desktop_results = list((ART / 'continuacion-20261116').glob('desktop-*/resultado.json'))
if desktop_results:
    last = max(desktop_results, key=lambda p: p.stat().st_mtime)
    shutil.copyfile(last, DEST / 'ejecutable-actualizado.json')
for name in ['partidas-desktop.png', 'partidas-mobile.png', 'recorrido.log']:
    shutil.copyfile(ART / 'qa-cli' / name, DEST / ('cli-' + name))
initial = ART / 'qa-inicial/results/system-editar-persona-conserva-datos-y-custodia-desktop'
if initial.is_dir():
    shutil.copyfile(initial / 'test-failed-1.png', DEST / 'persona-antes-404.png')


def junit(name):
    suites = list(ET.parse(ART / name).getroot().iter('testsuite'))
    return {key: sum(int(s.attrib.get(key, 0)) for s in suites) for key in ['tests', 'failures', 'errors', 'skipped']}


pw = json.loads((ART / 'playwright/results.json').read_text(encoding='utf-8'))
front = json.loads((ART / ('buttons-frontend.json' if (ART / 'buttons-frontend.json').exists() else 'qa-frontend.json')).read_text(encoding='utf-8'))
runtime = json.loads((ART / 'runtime-audit.json').read_text(encoding='utf-8'))
bandit = json.loads((ART / 'bandit-final.json').read_text(encoding='utf-8'))
summary = {'date': '2026-11-16', 'timezone': 'America/Bogota',
           'backend_full': junit('qa-backend.xml'), 'backend_regressions': junit('qa-regresiones-final.xml'),
           'frontend': {'passed': front['numPassedTests'], 'failed': front['numFailedTests']},
           'playwright': pw['stats'], 'cli_modules': 19,
           'runtime_known_vulnerabilities': sum(len(d.get('vulns', [])) for d in runtime['dependencies']),
           'bandit': {'low': sum(r['issue_severity'] == 'LOW' for r in bandit['results']),
                      'medium_or_high': sum(r['issue_severity'] != 'LOW' for r in bandit['results'])},
           'persistence': json.loads((ART / 'qa-persistence.json').read_text(encoding='utf-8')),
           'strix': json.loads((ART / 'strix-preflight.json').read_text(encoding='utf-8')),
           'render': json.loads((ART / 'render-validation.json').read_text(encoding='utf-8'))}
if (buttons / 'inventario.json').is_file():
    inventory = json.loads((buttons / 'inventario.json').read_text(encoding='utf-8'))
    summary['buttons_cli'] = {'actions': len(inventory['actions']), 'clicks': len(inventory['clicked']),
                              'requests': len(inventory['http']), 'errors': inventory['errors']}
    labels = {'administrador': 'Administrador', 'parroco': 'Párroco', 'canciller': 'Canciller',
              'consulta': 'Consulta', 'secretario_parroquial, parroquia 2': 'Secretaría parroquial, parroquia 2'}
    lines = ['# Inventario funcional de botones', '',
             'Recorrido real mediante Playwright CLI, con PostgreSQL independiente y datos ficticios.', '',
             '| Módulo | Acción comprobada | Rol | Resultado |', '|---|---|---|---|']
    for action in inventory['actions']:
        values = [action['modulo'], action['accion'], labels.get(action['rol'], action['rol']), action['resultado']]
        lines.append('| ' + ' | '.join(value.replace('|', '/').replace('\n', ' ') for value in values) + ' |')
    (ROOT / 'AUDITORIA_20261116/INVENTARIO_BOTONES.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
(DEST / 'resumen.json').write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding='utf-8')

# Reproducible, shareable diagnostic trace. Its request bodies were scrubbed by
# sanitize_evidence.py before collection. It is not mixed with original traces.
bundle = ART / 'entrega/SGD_TIBU_EVIDENCIAS_SANEADAS.zip'
bundle.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(bundle, 'w', ZIP_DEFLATED) as archive:
    for path in sorted(DEST.rglob('*')):
        if path.is_file():
            archive.write(path, path.relative_to(DEST).as_posix())
    trace = initial / 'trace.zip'
    if trace.is_file():
        archive.write(trace, 'diagnostico-persona-antes/trace.zip')
bundle.with_suffix('.zip.sha256').write_text(hashlib.sha256(bundle.read_bytes()).hexdigest() + '  ' + bundle.name + '\n')
print(json.dumps(summary, ensure_ascii=True))
