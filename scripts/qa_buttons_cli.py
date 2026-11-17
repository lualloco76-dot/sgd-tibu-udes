"""Click the shared action audit through Playwright CLI against synthetic data."""
import json
import re
import subprocess
from qa import ROOT, PRIVATE, config

v=config()
out=ROOT/'.test-artifacts/buttons-cli'
out.mkdir(parents=True,exist_ok=True)
source=(ROOT/'frontend/e2e/button-audit.flow.js').read_text(encoding='utf-8')
source=source[source.index('export async function'):].replace('export async function','async function',1)
code='async page => { '+source+'; return await auditButtons(page, '+json.dumps({'password':v['QA_PASSWORD'],'evidenceDir':out.as_posix()})+'); }'
script=PRIVATE/'buttons-cli.js';script.write_text(code,encoding='utf-8')
cli=['node',str(ROOT/'frontend/node_modules/playwright/cli.js'),'cli','-s=botones']
try:
    for args in [('open','--browser=chrome'),('run-code','--filename='+str(script)),('console','error'),('requests',),('close',)]:
        r=subprocess.run(cli+list(args),cwd=ROOT/'frontend',capture_output=True,text=True,encoding='utf-8',errors='replace')
        clean=re.sub(r'eyJ[\w-]+\.[\w-]+\.[\w-]+','[JWT REDACTADO]',(r.stdout+r.stderr).replace(v['QA_PASSWORD'],'[REDACTADO]'))
        with (out/'recorrido.log').open('w' if args[0]=='open' else 'a',encoding='utf-8') as log:log.write(clean+'\n')
        if r.returncode or '### Error' in clean:
            print(clean[-3000:]);raise SystemExit(1)
        if args[0]=='run-code':
            start=clean.find('### Result')
            end=clean.find('### Ran Playwright code')
            raw=clean[start+len('### Result'):end].strip()
            (out/'inventario.json').write_text(raw,encoding='utf-8')
    print('Auditoría de botones CLI completada: resultados y capturas en .test-artifacts/buttons-cli')
finally:
    # A failed interaction must not leave a browser holding a live session open.
    subprocess.run(cli+['close'],cwd=ROOT/'frontend',capture_output=True)
    script.unlink(missing_ok=True)
