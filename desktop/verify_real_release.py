"""Verify the real evaluator release on an isolated PostgreSQL copy."""
from datetime import datetime,timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT));sys.path.insert(0,str(ROOT/'backend'))
PRIVATE=ROOT/'.test-artifacts/evaluadores-real'
EVIDENCE=PRIVATE/'evidence'
BUILD=ROOT/'.test-artifacts/distribution'
os.environ['SGD_DATA_DIR']=str(BUILD/'lab/demo-data')
from desktop.secure_config import read


def run(args,env=None,expected=0):
    with (PRIVATE/'validacion.log').open('ab') as output:
        value=subprocess.run(list(map(str,args)),env=env,stdout=output,stderr=output,timeout=240,creationflags=subprocess.CREATE_NO_WINDOW)
    assert value.returncode==expected,Path(args[0]).name


def report(name,value):
    EVIDENCE.mkdir(parents=True,exist_ok=True)
    (EVIDENCE/name).write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf8')


def main():
    import httpx
    from sqlalchemy import create_engine,inspect,text
    EVIDENCE.mkdir(parents=True,exist_ok=True)
    lab=read('lab.dat');assert lab['port']==55453
    installer=BUILD/'inno-output/SGD_Tibu_Setup.exe'
    target=PRIVATE/'installed'
    run([installer,'/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/DIR='+str(target),'/LOG='+str(PRIVATE/'instalador-real.log')])
    exe=target/'SGD_Tibu.exe'
    assert not (target/'desktop/demo_accounts.json').exists()
    assert (target/'desktop/resources/sgd_tibu_real.dump').exists()
    env=os.environ.copy();env['SGD_DATA_DIR']=str(PRIVATE/'runtime-data')
    stamp=datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
    options=dict(host='127.0.0.1',port=55453,database='sgd_eval_instalacion_'+stamp,role='sgd_eval_app_'+stamp,
                 admin_user='sgd_build_admin',admin_password=lab['password'],mode='real')
    env['SGD_SETUP_JSON']=json.dumps(options)
    result=PRIVATE/'configuracion-real.json'
    run([exe,'--configure-env','--result',result],env=env)
    assert json.loads(result.read_text())['estado']=='configurado',result.read_text()
    old=os.environ['SGD_DATA_DIR'];os.environ['SGD_DATA_DIR']=env['SGD_DATA_DIR']
    try:config=read('config.dat')
    finally:os.environ['SGD_DATA_DIR']=old
    engine=create_engine(config['database_url'],hide_parameters=True)
    with engine.connect() as c:
        counts={t:c.execute(text('SELECT COUNT(*) FROM "'+t+'"')).scalar_one() for t in inspect(c).get_table_names()}
        expected=json.loads((PRIVATE/'payload/manifest.json').read_text())['counts']
        assert counts==expected,(counts,expected)
        assert c.execute(text("SELECT COUNT(*) FROM usuarios WHERE email LIKE 'demo.%@example.org'")).scalar_one()==0
    report('restauracion-instalada.json',dict(base_real_restaurada=True,comparacion_con_origen_distribuido=True,cuenta_original_conservada=True,filas=counts))
    # Capture-only preview uses a separate empty profile and never changes data.
    preview=env.copy();preview['SGD_DATA_DIR']=str(PRIVATE/'wizard-preview')
    (EVIDENCE/'capturas').mkdir(exist_ok=True)
    run([exe,'--no-browser','--preview-wizard',EVIDENCE/'capturas/asistente_real.png'],env=preview)
    env.pop('SGD_SETUP_JSON',None)
    start=PRIVATE/'inicio-real.json'
    start.unlink(missing_ok=True)
    isolated=env.copy();isolated['PATH']=str(Path(os.environ['WINDIR'])/'System32');isolated.pop('PYTHONPATH',None);isolated.pop('PYTHONHOME',None)
    process=subprocess.Popen([str(exe),'--serve-only','--no-browser','--result',str(start)],env=isolated)
    for _ in range(180):
        if start.exists():break
        assert process.poll() is None
        time.sleep(.2)
    state=json.loads(start.read_text());assert state['estado']=='disponible',state
    try:
        with httpx.Client(base_url=state['url'],trust_env=False,timeout=30) as client:
            login=client.post('/api/auth/login',json=dict(email='admin@iglesia.org',password='admin123',parroquia_id=None))
            assert login.status_code==200,login.text
            headers={'Authorization':'Bearer '+login.json()['access_token']}
            user=client.get('/api/auth/me',headers=headers).json()
            assert user['email']=='admin@iglesia.org' and user['rol']=='administrador' and not user['debe_cambiar_password']
            paths=['/api/parroquias/','/api/personas/','/api/registros/','/api/sacramentos/','/api/libros/','/api/solicitudes/','/api/certificados/','/api/documentos/','/api/usuarios/','/api/auditoria/','/api/roles/','/api/respaldos/','/api/reportes']
            routes=[]
            for path in paths:
                response=client.get(path,headers=headers);assert response.status_code==200,(path,response.text)
                routes.append(dict(ruta=path,http=200))
            assert len(client.get('/api/parroquias/',headers=headers).json())==13
            assert client.get('/api/registros/',headers=headers).json()==[]
            job=client.post('/api/respaldos/',headers=headers);assert job.status_code==202,job.text
            for _ in range(120):
                rows=client.get('/api/respaldos/',headers=headers).json();backup=next(row for row in rows if row['id']==job.json()['id'])
                if backup['estado']!='en_curso':break
                time.sleep(.5)
            assert backup['estado']=='completado',backup
            assert client.post('/api/respaldos/'+backup['id']+'/verificar',headers=headers).status_code==200
            assert client.get('/login').status_code==200 and client.get('/registros').status_code==200
            report('autenticacion-real.json',dict(usuario=user['email'],rol=user['rol'],password_solicitada_verificada_por_api=True,sin_cambio_obligatorio=True,rutas=routes,respaldo_real_verificado=True))
        duplicate=PRIVATE/'instancia-reutilizada.json'
        duplicate.unlink(missing_ok=True)
        run([exe,'--no-browser','--result',duplicate],env=env)
        assert json.loads(duplicate.read_text())['pid']==state['pid']
        browserenv=env.copy();browserenv['SGD_EVAL_URL']=state['url']
        run(['node',ROOT/'desktop/capture_real.mjs'],env=browserenv)
    finally:
        run([exe,'--stop'],env=env);process.wait(timeout=40);assert process.returncode==0
    # No overwrite on a repeated initialisation without authorization.
    env['SGD_SETUP_JSON']=json.dumps(options)
    run([exe,'--configure-env','--result',PRIVATE/'repeticion-rechazada.json'],env=env,expected=1)
    options['allow_existing']=True;env['SGD_SETUP_JSON']=json.dumps(options)
    with engine.connect() as c:before={t:c.execute(text('SELECT COUNT(*) FROM "'+t+'"')).scalar_one() for t in inspect(c).get_table_names()}
    run([exe,'--configure-env','--result',PRIVATE/'repeticion-autorizada.json'],env=env)
    # Use administrative lab credentials for comparison after the app password rotates.
    from sqlalchemy.engine import URL
    engine.dispose();engine=create_engine(URL.create('postgresql+psycopg2',username='sgd_build_admin',password=lab['password'],host='127.0.0.1',port=55453,database=options['database']))
    with engine.connect() as c:assert before=={t:c.execute(text('SELECT COUNT(*) FROM "'+t+'"')).scalar_one() for t in inspect(c).get_table_names()}
    report('ciclo-vida-real.json',dict(instalador_real=True,sin_dependencias_python_node_en_path=True,instancia_unica=True,cierre_ordenado=True,repeticion_segura=True,windows_limpio=False))
    schema={}
    with engine.connect() as c:
        inspector=inspect(c)
        for table in sorted(inspector.get_table_names()):
            columns=inspector.get_columns(table)
            for column in columns:column['type']=str(column['type'])
            schema[table]=dict(columns=columns,pk=inspector.get_pk_constraint(table),foreign_keys=inspector.get_foreign_keys(table),unique=inspector.get_unique_constraints(table),checks=inspector.get_check_constraints(table),indexes=inspector.get_indexes(table))
    report('esquema.json',schema);engine.dispose()
    print('Instalador real, admin@iglesia.org, módulos, respaldo y capturas comprobados')


if __name__=='__main__':main()
