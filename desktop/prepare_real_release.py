"""Copy the configured real DB for the user's requested evaluator delivery.

The configured source database is only read. Migration and session cleanup occur
exclusively on a separate PostgreSQL laboratory database.
"""
from datetime import datetime,timezone
import hashlib
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT));sys.path.insert(0,str(ROOT/'backend'))
PRIVATE=ROOT/'.test-artifacts/evaluadores-real'
PAYLOAD=PRIVATE/'payload'
PG=Path('C:/Program Files/PostgreSQL/18/bin')


def execute(args,env=None):
    PRIVATE.mkdir(parents=True,exist_ok=True)
    with (PRIVATE/'preparacion.log').open('ab') as output:
        result=subprocess.run(list(map(str,args)),env=env,stdout=output,stderr=output,timeout=240,creationflags=subprocess.CREATE_NO_WINDOW)
    if result.returncode:raise RuntimeError('Falló '+Path(args[0]).name+'; revise el registro privado')


def main():
    from dotenv import dotenv_values
    from sqlalchemy import create_engine,inspect,text
    from sqlalchemy.engine import make_url,URL
    import psycopg2
    from psycopg2 import sql
    import bcrypt
    values=dotenv_values(ROOT/'backend/.env');source=make_url(values['DATABASE_URL'])
    assert source.get_backend_name()=='postgresql' and source.host in {'localhost','127.0.0.1','::1'} and source.database=='parroquia'
    PAYLOAD.mkdir(parents=True,exist_ok=True)
    source_engine=create_engine(source,hide_parameters=True,connect_args={'options':'-c default_transaction_read_only=on'})
    with source_engine.connect() as c:
        counts={t:c.execute(text('SELECT COUNT(*) FROM "'+t+'"')).scalar_one() for t in inspect(c).get_table_names()}
        account=c.execute(text('SELECT password_hash,rol,activo FROM usuarios WHERE email=:email'),dict(email='admin@iglesia.org')).mappings().one()
        assert account['activo'] and account['rol']=='administrador' and bcrypt.checkpw(b'admin123',account['password_hash'].encode())
        assert counts['documentos']==0,'Si se agregaron documentos reales, incorpórelos antes de preparar esta entrega'
    env=os.environ.copy();env['PGPASSWORD']=source.password or '';env['PGCONNECT_TIMEOUT']='10'
    raw=PRIVATE/'respaldo_origen_privado.dump'
    execute([PG/'pg_dump.exe','-h',source.host,'-p',source.port or 5432,'-U',source.username,'--no-password','-d',source.database,'-Fc','--no-owner','--no-privileges','-f',raw],env)
    # Reuse only the dedicated laboratory cluster, never the source server.
    os.environ['SGD_DATA_DIR']=str(ROOT/'.test-artifacts/distribution/lab/demo-data')
    from desktop.secure_config import read
    laboratory=read('lab.dat');assert laboratory and laboratory['port']==55453
    pgdata=ROOT/'.test-artifacts/distribution/lab/pgdata-v2'
    status=subprocess.run([str(PG/'pg_ctl.exe'),'-D',str(pgdata),'status'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    if status.returncode:execute([PG/'pg_ctl.exe','-D',pgdata,'-l',PRIVATE/'postgres-laboratorio.log','-o','-h 127.0.0.1 -p 55453','-w','start'])
    target='sgd_eval_preparacion_'+datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
    connection=psycopg2.connect(host='127.0.0.1',port=55453,user='sgd_build_admin',password=laboratory['password'],dbname='postgres');connection.autocommit=True
    try:
        with connection.cursor() as c:c.execute(sql.SQL('CREATE DATABASE {} TEMPLATE template0 ENCODING {}').format(sql.Identifier(target),sql.Literal('UTF8')))
    finally:connection.close()
    env['PGPASSWORD']=laboratory['password']
    execute([PG/'pg_restore.exe','-h','127.0.0.1','-p','55453','-U','sgd_build_admin','--no-password','--no-owner','--no-privileges','--exit-on-error','--single-transaction','-d',target,raw],env)
    url=URL.create('postgresql+psycopg2',username='sgd_build_admin',password=laboratory['password'],host='127.0.0.1',port=55453,database=target)
    os.environ.update(SGD_DESKTOP='1',DATABASE_URL='sqlite://',SECRET_KEY=secrets.token_urlsafe(48))
    from ejecutar_schema import migrate
    migrate(url.render_as_string(hide_password=False))
    engine=create_engine(url,hide_parameters=True)
    with engine.begin() as c:
        # Sessions belong to the original machine, and old backup files are not
        # transferred. Business rows and the original audit trail are preserved.
        c.execute(text('DELETE FROM sesiones'))
        c.execute(text('DELETE FROM respaldos'))
        c.execute(text("UPDATE configuracion_respaldos SET frecuencia='manual', proximo=NULL, en_curso=FALSE, trabajo_id=NULL, latido=NULL"))
        assert not c.execute(text("SELECT debe_cambiar_password FROM usuarios WHERE email='admin@iglesia.org'")).scalar_one()
        after={t:c.execute(text('SELECT COUNT(*) FROM "'+t+'"')).scalar_one() for t in inspect(c).get_table_names()}
        for table,count in counts.items():
            if table not in {'sesiones','respaldos'}:assert after[table]==count,table
        assert c.execute(text("SELECT COUNT(*) FROM usuarios WHERE email LIKE 'demo.%@example.org'")).scalar_one()==0
    dump=PAYLOAD/'sgd_tibu_real.dump'
    execute([PG/'pg_dump.exe','-h','127.0.0.1','-p','55453','-U','sgd_build_admin','--no-password','-d',target,'-Fc','--no-owner','--no-privileges','-f',dump],env)
    execute([PG/'pg_dump.exe','-h','127.0.0.1','-p','55453','-U','sgd_build_admin','--no-password','-d',target,'--schema-only','--no-owner','--no-privileges','-f',PRIVATE/'estructura.sql'],env)
    manifest=dict(edition='evaluadores-real',version='2.2.0',created_utc=datetime.now(timezone.utc).isoformat(),source_database='parroquia',
                  snapshot_file=dump.name,snapshot_sha256=hashlib.sha256(dump.read_bytes()).hexdigest(),counts=after,account_email='admin@iglesia.org',documents=[])
    (PAYLOAD/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
    report=dict(base_origen='parroquia',original_solo_lectura=True,revision_original='0005',revision_distribuida='0006',
                filas_originales=counts,filas_distribuidas=after,sin_datos_fabricados=True,cuenta_original_conservada=True,
                contraseña_solicitada_verificada=True,sesiones_no_transferidas=counts['sesiones'],historial_archivos_respaldo_no_transferido=counts['respaldos'],
                motivo='Sesiones y copias operativas pertenecen al equipo original. La información de negocio y auditoría se conservan en la copia.',dump_sha256=manifest['snapshot_sha256'])
    (PRIVATE/'origen-copia.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    engine.dispose();source_engine.dispose()
    print(json.dumps(dict(base_real=source.database,parroquias=after['parroquias'],usuarios=after['usuarios'],partidas=after['registros_sacramentales'],original_sin_cambios=True,revision_copia='0006'),ensure_ascii=False))


if __name__=='__main__':main()
