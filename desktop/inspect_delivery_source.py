"""Read-only inventory of the database explicitly requested for evaluator delivery."""
import hashlib
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'backend'))
from dotenv import dotenv_values
from sqlalchemy import create_engine,inspect,text
from sqlalchemy.engine import make_url
import bcrypt


def main():
    values=dotenv_values(ROOT/'backend/.env')
    url=make_url(values['DATABASE_URL'])
    if url.get_backend_name()!='postgresql' or url.host not in {'127.0.0.1','localhost','::1'}:
        raise RuntimeError('Se esperaba la base PostgreSQL local configurada')
    engine=create_engine(url,connect_args={'connect_timeout':8,'options':'-c default_transaction_read_only=on'},hide_parameters=True)
    try:
        with engine.connect() as c:
            inspector=inspect(c)
            tables=inspector.get_table_names()
            counts={name:c.execute(text('SELECT COUNT(*) FROM "'+name+'"')).scalar_one() for name in tables}
            account=c.execute(text('SELECT id,rol,activo,password_hash FROM usuarios WHERE lower(email)=:email'),dict(email='admin@iglesia.org')).mappings().first()
            check=None if not account else dict(id=account['id'],rol=account['rol'],activo=account['activo'],password_solicitada_coincide=bcrypt.checkpw(b'admin123',account['password_hash'].encode()))
            documents=[]
            for row in c.execute(text('SELECT id,ruta_archivo,hash_sha256 FROM documentos')).mappings():
                path=Path(row['ruta_archivo'])
                exists=path.is_file()
                good=exists and hashlib.sha256(path.read_bytes()).hexdigest()==row['hash_sha256']
                documents.append(dict(id=row['id'],archivo_disponible=exists,hash_correcto=good))
            result=dict(base=url.database,host=url.host,puerto=url.port or 5432,postgresql=c.execute(text('SHOW server_version')).scalar_one(),
                        revision=c.execute(text('SELECT version_num FROM alembic_version')).scalar_one(),tablas=counts,cuenta_solicitada=check,
                        documentos=documents,cuentas_ficticias_de_entrega_anterior=c.execute(text("SELECT COUNT(*) FROM usuarios WHERE email LIKE 'demo.%@example.org'")).scalar_one(),
                        operador_puede_crear_base=c.execute(text('SELECT rolcreatedb FROM pg_roles WHERE rolname=current_user')).scalar_one(),solo_lectura=True)
    finally:engine.dispose()
    out=ROOT/'.test-artifacts/evaluadores-real';out.mkdir(parents=True,exist_ok=True)
    (out/'inspeccion-origen.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps(result,ensure_ascii=False))


if __name__=='__main__':main()
