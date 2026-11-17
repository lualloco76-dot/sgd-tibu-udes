"""Exercise the real app with Playwright CLI; redact credentials from CLI logs."""
import json
from pathlib import Path
import re
import subprocess
import sys
from qa import ROOT, PRIVATE, config

values = config()
cli = ROOT / 'frontend/node_modules/playwright/cli.js'
output = ROOT / '.test-artifacts/qa-cli'
output.mkdir(parents=True, exist_ok=True)


def command(*args):
    result = subprocess.run(['node', str(cli), 'cli', '-s=qa', *args], cwd=ROOT / 'frontend',
                            capture_output=True, encoding='utf-8', errors='replace')
    clean = (result.stdout + result.stderr).replace(values['QA_PASSWORD'], '[REDACTADO]')
    clean = re.sub(r'eyJ[\w-]+\.[\w-]+\.[\w-]+', '[JWT REDACTADO]', clean)
    with (output / 'recorrido.log').open('a', encoding='utf-8') as log:
        log.write(clean + '\n')
    if result.returncode or '### Error' in clean:
        print(clean[-2500:])
        raise SystemExit(result.returncode or 1)


command('open', 'http://127.0.0.1:8765', '--browser=chrome')
# Never echo run-code source: the CLI normally prints supplied code verbatim.
source = '''async page => {
  await page.goto('http://127.0.0.1:8765/login');
  await page.getByLabel('Parroquia o acceso diocesano').selectOption('diocesis');
  await page.getByLabel('Correo electrónico').fill('administrador@evaluacion.example.org');
  await page.locator('input[name=password]').fill(PASSWORD);
  await page.getByRole('button', {name:'Iniciar sesión', exact:true}).click();
  await page.locator('.app-shell').waitFor();
}'''.replace('PASSWORD', json.dumps(values['QA_PASSWORD']))
script = PRIVATE / 'cli-login.js'
try:
    script.write_text(source, encoding='utf-8')
    command('run-code', '--filename=' + str(script))
finally:
    script.unlink(missing_ok=True)
command('tracing-start')
routes = ['/', '/registros', '/personas', '/bautismos', '/confirmaciones', '/matrimonios', '/defunciones',
          '/libros', '/solicitudes', '/certificados', '/documentos', '/parroquias', '/reportes',
          '/usuarios', '/auditoria', '/roles', '/sacramentos', '/respaldos', '/configuracion']
for route in routes:
    command('goto', 'http://127.0.0.1:8765' + route)
    print('CLI verificado:', route, flush=True)
command('goto', 'http://127.0.0.1:8765/registros')
command('screenshot', '--filename=' + str(output / 'partidas-desktop.png'))
command('resize', '390', '844')
command('screenshot', '--filename=' + str(output / 'partidas-mobile.png'))
command('console', 'error')
command('requests')
command('tracing-stop')
command('close')
print('Recorrido CLI completado. Evidencias privadas en .test-artifacts/qa-cli.')
