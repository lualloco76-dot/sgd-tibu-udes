"""Drive the real installed six-field wizard against an isolated new DB."""
import json
import os
from pathlib import Path
import subprocess
import sys
import time

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
PRIVATE=ROOT/'.test-artifacts/evaluadores-real'
os.environ['SGD_DATA_DIR']=str(ROOT/'.test-artifacts/distribution/lab/demo-data')
from desktop.secure_config import read


def main():
    lab=read('lab.dat');assert lab['port']==55453
    stamp=str(int(time.time()))
    options=dict(host='127.0.0.1',port=55453,database='sgd_eval_asistente_'+stamp,role='sgd_eval_asistente_app_'+stamp,admin_user='sgd_build_admin',admin_password=lab['password'])
    script=PRIVATE/'asistente-real-control.py'
    script.write_text('''import json,os,pathlib,tkinter as tk
from desktop.runtime import wizard
root=tk.Tk();root.withdraw()
output=pathlib.Path(os.environ.pop('SGD_WIZARD_RESULT'))
options=json.loads(os.environ.pop('SGD_SETUP_JSON'))
def finished(config):
 output.write_text(json.dumps(dict(estado='configurado_desde_asistente_real',edition=config['edition'],**config['verification'])),encoding='utf8')
 root.destroy()
wizard(root,finished)
window=root.winfo_children()[0];body=window.winfo_children()[0]
entries=[w for w in body.winfo_children() if w.winfo_class()=='TEntry']
assert len(entries)==6
for entry,key in zip(entries,['host','port','database','role','admin_user','admin_password']):
 entry.delete(0,'end');entry.insert(0,str(options[key]))
options.clear()
button=next(w for w in body.winfo_children() if w.winfo_class()=='TButton' and w.cget('text')=='Comprobar e inicializar')
root.after(200,button.invoke)
def timeout():
 if not output.exists():output.write_text(json.dumps(dict(estado='tiempo_agotado')),encoding='utf8')
 root.destroy()
root.after(60000,timeout)
root.mainloop()
''',encoding='utf8')
    output=PRIVATE/'evidence/asistente-interactivo-real.json'
    output.unlink(missing_ok=True)
    env=os.environ.copy();env['SGD_DATA_DIR']=str(PRIVATE/'wizard-real-data');env['SGD_WIZARD_RESULT']=str(output);env['SGD_SETUP_JSON']=json.dumps(options)
    result=subprocess.run([str(PRIVATE/'installed/runtime/pythonw.exe'),str(script)],env=env,timeout=70)
    assert result.returncode==0
    value=json.loads(output.read_text());assert value['estado']=='configurado_desde_asistente_real',value
    print('El botón del asistente real restauró y configuró la base correctamente')


if __name__=='__main__':main()
