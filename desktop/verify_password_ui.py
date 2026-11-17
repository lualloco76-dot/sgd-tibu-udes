"""End-to-end temporary-password replacement against the synthetic real mode."""
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys

sys.path.insert(0,str(Path(__file__).resolve().parent))
from validate import ROOT,LAB,prepare,launch,run,write


def main():
    import bcrypt
    import psycopg2
    state=prepare();email='administracion.ficticia@example.org'
    password=secrets.token_urlsafe(24);new=secrets.token_urlsafe(24)
    c=psycopg2.connect(host='127.0.0.1',port=55453,user='sgd_build_admin',password=state['password'],dbname='sgd_tibu_real_test')
    try:
        with c.cursor() as cursor:
            cursor.execute('UPDATE usuarios SET password_hash=%s, debe_cambiar_password=TRUE, token_version=token_version+1 WHERE email=%s',
                           (bcrypt.hashpw(password.encode(),bcrypt.gensalt()).decode(),email))
            assert cursor.rowcount==1
        c.commit()
    finally:c.close()
    exe=LAB/'installed/SGD_Tibu.exe';directory=LAB/'real-data'
    process,started=launch(exe,directory)
    try:
        env=os.environ.copy();env.update(SGD_UI_URL=started['url'],SGD_UI_EMAIL=email,SGD_UI_PASSWORD=password,SGD_UI_NEW_PASSWORD=new)
        run(['node',ROOT/'desktop/password_ui.mjs'],env=env)
        write('password-interfaz.json',dict(formulario_obligatorio=True,modulos_no_visibles=True,cambio_real=True,mensaje_explicativo=True,reingreso_con_nueva_password=True))
    finally:
        env=os.environ.copy();env['SGD_DATA_DIR']=str(directory)
        run([exe,'--stop'],env=env);process.wait(timeout=40)
    print('Cambio obligatorio de contraseña comprobado desde el navegador')


if __name__=='__main__':main()
