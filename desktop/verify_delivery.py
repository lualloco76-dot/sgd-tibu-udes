"""Additional local acceptance checks using the official installed runtime."""
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import time

sys.path.insert(0,str(Path(__file__).resolve().parent))
from validate import ROOT, BUILD, LAB, PUBLIC, PG, prepare, configure, launch, run, write


def main():
    import httpx
    import psycopg2
    state=prepare();exe=LAB/'installed/SGD_Tibu.exe'
    run([exe,'--stop']);time.sleep(2)
    # Authenticate all seven accounts against the ACTUALLY restored dump.
    operator=psycopg2.connect(host='127.0.0.1',port=55453,user='sgd_build_admin',password=state['password'],dbname='postgres')
    operator.autocommit=True
    try:
        with operator.cursor() as c:c.execute("COMMENT ON DATABASE sgd_tibu_restore_test IS 'SGD_TIBU:demo'")
    finally:operator.close()
    restored={**state,'database':'sgd_tibu_restore_test','role':'sgd_tibu_restore_app'}
    directory=LAB/'restore-data'
    configure(exe,restored,directory=directory,allow=True)
    process,started=launch(exe,directory)
    results=[]
    try:
        with httpx.Client(base_url=started['url'],trust_env=False,timeout=20) as client:
            for account in json.loads((ROOT/'desktop/demo_accounts.json').read_text()):
                parish=1 if account['role'] in {'parroco','secretario_parroquial','consulta'} else None
                login=client.post('/api/auth/login',json=dict(email=account['email'],password=account['password'],parroquia_id=parish))
                assert login.status_code==200,account['role']
                headers={'Authorization':'Bearer '+login.json()['access_token']}
                assert client.get('/api/auth/me',headers=headers).json()['rol']==account['role']
                results.append(dict(rol=account['role'],login_restaurado='APROBADO'))
    finally:
        env=os.environ.copy();env['SGD_DATA_DIR']=str(directory)
        run([exe,'--stop'],env=env);process.wait(timeout=40)
    write('accesos-dump-restaurado.json',results)
    # An actual desktop wizard is filled and its real submit button is invoked.
    # No administrative password is written to disk: options are inherited once.
    script=LAB/'wizard-smoke.py'
    script.write_text('''import json,os,pathlib,tkinter as tk
from desktop.runtime import wizard
root=tk.Tk();root.withdraw()
result=pathlib.Path(os.environ.pop('SGD_WIZARD_RESULT'))
options=json.loads(os.environ.pop('SGD_SETUP_JSON'))
def done(config):
 result.write_text(json.dumps(dict(estado='configurado_desde_interfaz',**config['verification'])),encoding='utf8')
 root.destroy()
wizard(root,done)
window=root.winfo_children()[0]
body=window.winfo_children()[0]
entries=[w for w in body.winfo_children() if w.winfo_class()=='TEntry']
keys=['host','port','database','role','admin_user','admin_password','email','password']
for entry,key in zip(entries,keys):
 entry.delete(0,'end');entry.insert(0,str(options.get(key,'')))
for frame in body.winfo_children():
 for widget in frame.winfo_children():
  if widget.winfo_class()=='TRadiobutton' and widget.cget('value')=='demo':widget.invoke()
options.clear()
button=next(w for w in body.winfo_children() if w.winfo_class()=='TButton' and w.cget('text')=='Comprobar e inicializar')
root.after(300,button.invoke)
def timeout():
 if not result.exists():result.write_text(json.dumps(dict(estado='timeout')),encoding='utf8')
 root.destroy()
root.after(45000,timeout)
root.mainloop()
''',encoding='utf8')
    env=os.environ.copy();env['SGD_DATA_DIR']=str(LAB/'wizard-smoke-data')
    env['SGD_WIZARD_RESULT']=str(LAB/'wizard-smoke.json')
    env['SGD_SETUP_JSON']=json.dumps(dict(host='127.0.0.1',port=55453,database='sgd_tibu_wizard_test',role='sgd_tibu_wizard_app',admin_user='sgd_build_admin',admin_password=state['password']))
    run([exe.parent/'runtime/pythonw.exe',script],env=env,timeout=60)
    wizard_result=json.loads((LAB/'wizard-smoke.json').read_text());assert wizard_result['estado']=='configurado_desde_interfaz',wizard_result
    write('asistente-interactivo.json',wizard_result)
    # Stop/restart ONLY the laboratory cluster, never the installed PG service.
    run([PG/'pg_ctl.exe','-D',LAB/'pgdata-v2','-m','fast','-w','stop'])
    result=LAB/'postgres-stopped.json'
    failed=subprocess.run([str(exe),'--check','--no-browser','--result',str(result)],timeout=30)
    assert failed.returncode==1 and json.loads(result.read_text())['estado']=='error'
    run([PG/'pg_ctl.exe','-D',LAB/'pgdata-v2','-l',LAB/'postgres-v2.log','-o','-h 127.0.0.1 -p 55453','-w','start'])
    run([exe,'--check','--no-browser','--result',LAB/'postgres-restarted.json'])
    write('postgres-detenido-reiniciado.json',dict(detenido_detectado=True,mensaje=json.loads(result.read_text())['detalle'],reinicio_cluster=True,conexion_recuperada=True,reinicio_windows=False))
    print('Siete accesos del dump restaurado, asistente gráfico real y reinicio PostgreSQL verificados')


if __name__=='__main__':main()
