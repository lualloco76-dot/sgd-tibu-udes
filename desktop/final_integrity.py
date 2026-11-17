"""Final source, privacy, document, archive and extracted-executable checks."""
import ast
import csv
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
import zipfile
from datetime import datetime

ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT),str(ROOT/'backend')]
from desktop.final_release import WORK,OUT,dump_json,digest,command


def source_unchanged():
    from dotenv import dotenv_values
    from sqlalchemy import create_engine,inspect,text
    before=json.loads((WORK/'origen-antes.json').read_text())
    engine=create_engine(dotenv_values(ROOT/'backend/.env')['DATABASE_URL'],hide_parameters=True,
                         connect_args={'options':'-c default_transaction_read_only=on'})
    try:
        with engine.connect() as connection:
            counts={t:connection.execute(text('SELECT COUNT(*) FROM "'+t+'"')).scalar_one() for t in inspect(connection).get_table_names()}
            signatures={}
            for table in counts:
                signatures[table]=connection.execute(text('SELECT md5(COALESCE(string_agg(row_to_json(t)::text, chr(10) ORDER BY row_to_json(t)::text),\'\')) FROM "'+table+'" t')).scalar_one()
            assert counts==before['counts'] and signatures==before['firmas'], 'El contenido del origen cambió durante la preparación; revisar antes de afirmar identidad'
    finally:engine.dispose()
    dump_json(OUT/'08_PRUEBAS/origen-sin-modificaciones.json',dict(conteos_antes=before['counts'],conteos_despues=counts,firmas_contenido_identicas=True,conexion_solo_lectura=True))


def documents():
    from pypdf import PdfReader
    from docx import Document
    import xml.etree.ElementTree as ET
    report=[]
    for pdf in sorted(OUT.rglob('*.pdf')):
        reader=PdfReader(pdf);texts=[page.extract_text() or '' for page in reader.pages]
        assert texts and all(text.strip() for text in texts),pdf
        if pdf.name=='LEEME_PRIMERO.pdf':assert len(reader.pages)<=5
        if pdf.name.startswith('MANUAL_'):
            assert any('Tabla de contenido' in t for t in texts)
            assert not any('Placeholder for table of contents' in t for t in texts)
        report.append(dict(archivo=pdf.relative_to(OUT).as_posix(),paginas=len(reader.pages),texto_extraible=True))
    for path in OUT.rglob('*.docx'):
        doc=Document(path)
        assert doc.styles['Normal'].font.name=='Times New Roman'
        assert doc.styles['Normal'].font.size.pt==12
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for paragraph in cell.paragraphs:
                        for run in paragraph.runs:
                            assert run.font.size and run.font.size.pt==10,(path,'Fuente de tabla')
    dump_json(OUT/'08_PRUEBAS/documentos-verificados.json',report)
    print('Documentos comprobados: '+str(len(report))+' PDF; guía <=5 páginas.',flush=True)


def static_inventory():
    from desktop.final_documents import copy_sources
    inventory=copy_sources()
    python_count=0
    for row in inventory:
        source=OUT/'06_CODIGO_FUENTE'/row['archivo']
        assert digest(source)==row['sha256']
        if source.suffix=='.py':
            ast.parse(source.read_text(encoding='utf-8-sig'));python_count+=1
    # Never include developer state or data profiles, even within nested paths.
    forbidden={'config.dat','postgresql.dat','lab.dat','.env','origen-privado.dump','respaldo_origen_privado.dump','demo_accounts.json'}
    files=[p for p in OUT.rglob('*') if p.is_file()]
    assert not any(path.name in forbidden for path in files)
    assert not any('postmaster.pid'==path.name or path.name=='PG_VERSION' for path in files)
    # Known production secret must not occur in delivered text. Compare without
    # printing the values, URLs, hashes or the text that matched.
    from dotenv import dotenv_values
    from sqlalchemy.engine import make_url
    values=dotenv_values(ROOT/'backend/.env')
    secrets=[values.get('SECRET_KEY',''),make_url(values['DATABASE_URL']).password or '']
    secrets=[s for s in secrets if len(s)>=8 and s!='admin123']
    text_ext={'.py','.js','.jsx','.mjs','.json','.css','.html','.md','.txt','.ini','.sql','.ps1','.cs','.lock','.iss','.bat','.csv'}
    checked=0
    for path in files:
        if path.suffix not in text_ext:continue
        try:value=path.read_text(encoding='utf-8-sig')
        except UnicodeError:continue
        assert not any(secret in value for secret in secrets),'Un archivo de texto contiene un secreto de origen; distribución interrumpida'
        checked+=1
    dump_json(OUT/'08_PRUEBAS/fuentes-y-privacidad.json',dict(archivos_fuente=len(inventory),python_sintaxis_valida=python_count,
              archivos_texto_revisados=checked,secretos_configurados_no_detectados=True,perfiles_privados_excluidos=True,
              alcance='Se cotejan secretos conocidos del .env sin publicarlos. No se afirma un análisis forense de todos los binarios de terceros.'))


def safe_repeat(executable,profile):
    """Attempt provisioning again against the existing, owned test DB."""
    from desktop.secure_config import read
    os.environ['SGD_DATA_DIR']=str(profile)
    import desktop.local_postgres as local
    local.binaries=lambda:executable.parent/'postgresql/bin'
    manager=local.LocalPostgres()
    try:
        state=manager.start()
        config_before=(profile/'config.dat').read_bytes()
        env=os.environ.copy()
        env['SGD_SETUP_JSON']=json.dumps(dict(host='127.0.0.1',port=state['port'],database='sgd_tibu_evaluacion',
            role='sgd_eval_app',mode='real',admin_user=state['user'],admin_password=state['password']))
        result=WORK/'repeticion-segura.json';result.unlink(missing_ok=True)
        process=subprocess.run([str(executable),'--configure-env','--no-browser','--result',str(result)],env=env,
                               timeout=90,creationflags=subprocess.CREATE_NO_WINDOW)
        response=json.loads(result.read_text(encoding='utf8'))
        assert process.returncode==1 and response['estado']=='error' and 'ya existe' in response['detalle']
        assert (profile/'config.dat').read_bytes()==config_before
        dump_json(OUT/'08_PRUEBAS/repeticion-segura.json',dict(reinicializacion_rechazada=True,configuracion_conservada=True,sin_autorizacion_no_restaura=True))
    finally:manager.stop()


def main():
    source_unchanged();documents()
    # Rebuild only the dictionary's formatting; the schema is unchanged.
    import desktop.manual_render as render
    render.OUT=WORK/'doc-intermedio'
    render.dictionary(json.loads((WORK/'esquema.json').read_text()))
    shutil.copy2(render.OUT/'02_BASE_DATOS_POSTGRESQL/diccionario_datos.xlsx',OUT/'03_BASE_DATOS/diccionario_datos.xlsx')
    safe_repeat(WORK/'build/embedded-app/SGD_Tibu.exe',WORK/'acceptance-profile')
    static_inventory()
    files=[]
    for path in sorted(OUT.rglob('*')):
        if path.is_file() and path.name!='MANIFIESTO_SHA256.json':
            files.append(dict(archivo=path.relative_to(OUT).as_posix(),bytes=path.stat().st_size,sha256=digest(path)))
    dump_json(OUT/'MANIFIESTO_SHA256.json',files)
    archive=ROOT/'SGD_TIBU_VERSION_FINAL_PROFESORA_UDES.zip'
    print('Creando ZIP con '+str(len(files))+' archivos…',flush=True)
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as target:
        for path in sorted(OUT.rglob('*')):
            if path.is_file():target.write(path,path.relative_to(ROOT).as_posix())
    # Native DLL loading can still hit MAX_PATH in deeply nested Windows paths.
    # Use a short laboratory destination, as recommended in the evaluator guide.
    extraction=ROOT/'.test-artifacts'/('zip-'+datetime.now().strftime('%H%M%S'))
    assert not extraction.exists(),'Use una carpeta de extracción nueva para no mezclar resultados'
    extraction.mkdir()
    with zipfile.ZipFile(archive) as target:
        assert target.testzip() is None
        for name in target.namelist():
            assert (extraction/name).resolve().is_relative_to(extraction.resolve())
        target.extractall(extraction)
    for row in files:assert digest(extraction/OUT.name/row['archivo'])==row['sha256'],row['archivo']
    print('ZIP extraído y hashes exactos; probando el ejecutable extraído…',flush=True)
    executable=extraction/OUT.name/'01_PROGRAMA/SGD_Tibu.exe'
    env=os.environ.copy();env.update(SGD_DATA_DIR=str(WORK/'extracted-new-profile'),PATH=str(Path(os.environ['WINDIR'])/'System32'))
    result=WORK/'extracted-start.json';result.unlink(missing_ok=True)
    process=subprocess.Popen([str(executable),'--serve-only','--no-browser','--result',str(result)],env=env,
                             creationflags=subprocess.CREATE_NO_WINDOW)
    import httpx
    try:
        deadline=time.monotonic()+180
        while not result.exists() and time.monotonic()<deadline:
            assert process.poll() is None,'Falló ejecutable extraído'
            time.sleep(.2)
        state=json.loads(result.read_text(encoding='utf8'));assert state['estado']=='disponible',state
        with httpx.Client(base_url=state['url'],trust_env=False,timeout=30) as client:
            login=client.post('/api/auth/login',json=dict(email='admin@iglesia.org',password='admin123',parroquia_id=None))
            assert login.status_code==200
            headers={'Authorization':'Bearer '+login.json()['access_token']}
            assert len(client.get('/api/parroquias/',headers=headers).json())==13
            assert client.get('/api/registros/',headers=headers).json()==[]
    finally:
        command([executable,'--stop','--no-browser'],env)
        process.wait(timeout=90)
    assert process.returncode==0
    checksum=digest(archive)
    Path(str(archive)+'.sha256').write_text(checksum+'  '+archive.name+'\n',encoding='ascii')
    report=dict(zip=str(archive),bytes=archive.stat().st_size,MiB=round(archive.stat().st_size/1024**2,2),
                sha256=checksum,archivos=len(files)+1,CRC_correcto=True,extraccion_real=True,hashes_extraidos_exactos=True,
                ejecutable_extraido_inicia=True,login_admin_correcto=True,parroquias=13,partidas_precargadas=0,
                origen_sin_cambios=True,version_distribucion='3.0.0',commit_base='877cd91e1c890b4ff8204c5feb4dc14c53292ef8',cambios_locales=True,
                destino_extraccion=str(extraction),limitacion_rutas_largas='Extraer en una carpeta local corta; la carga de DLL puede fallar en rutas profundas de Windows.')
    dump_json(ROOT/'SGD_TIBU_VERSION_FINAL_PROFESORA_UDES_VERIFICACION.json',report)
    print(json.dumps(report,ensure_ascii=False),flush=True)


if __name__=='__main__':main()
