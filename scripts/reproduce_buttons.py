"""Reproduce reported defects on the isolated real PostgreSQL application."""
import json
import subprocess
import time
import httpx
from qa import ROOT, PRIVATE, config

v = config()
out = ROOT / '.test-artifacts/buttons-before'
out.mkdir(parents=True, exist_ok=True)
with httpx.Client(base_url='http://127.0.0.1:8765', trust_env=False) as c:
    def login(role, parish=None):
        r=c.post('/api/auth/login',json={'email':role+'@evaluacion.example.org','password':v['QA_PASSWORD'],'parroquia_id':parish})
        r.raise_for_status()
        return {'Authorization':'Bearer '+r.json()['access_token']}
    admin=login('administrador')
    persons=c.get('/api/personas/?limit=200',headers=admin).json()
    person=next(p for p in persons if p['parroquia_id']==2)
    record=c.post('/api/registros/',headers=admin,json={'persona_id':person['id'],'sacramento_id':1,'parroquia_id':2,'fecha_celebracion':'2020-01-10','libro':'EVAL-1','folio':'REVISION','numero':str(time.time_ns()),'datos':{}})
    record.raise_for_status(); record=record.json()
    local=login('secretario_parroquial',1)
    request=c.post('/api/solicitudes/',headers=local,json={'registro_id':record['id'],'motivo':'Reproducción ficticia de revisión de botones'})
    request.raise_for_status(); request=request.json()
    c.post(f"/api/solicitudes/{request['id']}/decision",headers=admin,json={'estado':'aprobada','motivo':'Revisión ficticia autorizada'}).raise_for_status()
    code='''async page => {
      await page.goto('http://127.0.0.1:8765/login');
      await page.getByLabel('Parroquia o acceso diocesano').selectOption('diocesis');
      await page.getByLabel('Correo electrónico').fill('administrador@evaluacion.example.org');
      await page.locator('input[name=password]').fill(PASSWORD);
      await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
      await page.locator('.app-shell').waitFor();
      await page.goto('http://127.0.0.1:8765/registros?numero=NUMBER');
      await page.getByRole('button',{name:'Ver',exact:true}).click();
      await page.screenshot({path:'BEFORE/partida.png',fullPage:true});
      await page.getByRole('button',{name:'Cerrar detalle'}).click();
      await page.getByRole('button',{name:'Historial',exact:true}).click();
      await page.screenshot({path:'BEFORE/historial.png',fullPage:true});
      await page.goto('http://127.0.0.1:8765/solicitudes');
      const row=page.locator('tbody tr').filter({has:page.locator('td:nth-child(2)',{hasText:/^RECORD$/})});
      await row.getByRole('button',{name:'Preparar certificado',exact:true}).click();
      await page.locator('.notice.success').waitFor();
      await row.getByRole('button',{name:'Preparar certificado',exact:true}).click();
      await page.locator('.notice.success').waitFor();
      await page.screenshot({path:'BEFORE/solicitud.png',fullPage:true});
      await page.goto('http://127.0.0.1:8765/certificados');
      await page.locator('tbody tr').filter({has:page.locator('td:nth-child(2)',{hasText:/^RECORD$/})}).first().getByRole('button',{name:'Ver trazabilidad'}).click();
      await page.screenshot({path:'BEFORE/trazabilidad.png',fullPage:true});
    }'''.replace('PASSWORD',json.dumps(v['QA_PASSWORD'])).replace('NUMBER',record['numero']).replace('RECORD',str(record['id'])).replace('BEFORE',out.as_posix())
    script=PRIVATE/'reproduce-buttons.js'
    script.write_text(code,encoding='utf-8')
    cli=['node',str(ROOT/'frontend/node_modules/playwright/cli.js'),'cli','-s=revision']
    for args in [('open','--browser=chrome'),('run-code','--filename='+str(script)),('console','error'),('requests',),('close',)]:
        r=subprocess.run(cli+list(args),cwd=ROOT/'frontend',capture_output=True,text=True,encoding='utf-8',errors='replace')
        clean=(r.stdout+r.stderr).replace(v['QA_PASSWORD'],'[REDACTADO]')
        with (out/'cli.log').open('a',encoding='utf-8') as log:log.write(clean+'\n')
        if r.returncode or '### Error' in clean:
            print(clean[-2000:]);raise SystemExit(1)
    script.unlink(missing_ok=True)
    certificates=c.get('/api/certificados/?limit=200',headers=admin).json()
    matches=[x for x in certificates if x['solicitud_id']==request['id']]
    result={'registro':record['id'],'solicitud':request['id'],'certificados_para_misma_solicitud':len(matches),'raw_details_reproduced':True}
    (out/'resultado.json').write_text(json.dumps(result),encoding='utf-8')
    print(json.dumps(result))
