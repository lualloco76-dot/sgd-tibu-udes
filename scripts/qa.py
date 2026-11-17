"""Real PostgreSQL evaluation environment. Never loads backend/.env.

Local: python scripts/qa.py setup; python scripts/qa.py serve
CI: QA_DATABASE_URL must name sgd_test or sgd_evaluacion; seed never drops data.
"""
import argparse
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = ROOT / '.test-data' / 'qa'
sys.path.insert(0, str(ROOT / 'backend'))
# Set these BEFORE importing application code; no fallback to legacy .env.
os.environ['SGD_DESKTOP'] = '1'
os.environ['BACKUP_SCHEDULER_ENABLED'] = 'false'


def config():
    from sqlalchemy.engine import make_url
    path = PRIVATE / 'runtime.json'
    if os.getenv('QA_DATABASE_URL'):
        values = {'DATABASE_URL': os.environ['QA_DATABASE_URL'],
                  'SECRET_KEY': os.environ.get('SECRET_KEY', ''),
                  'QA_PASSWORD': os.environ.get('QA_PASSWORD', '')}
        if len(values['SECRET_KEY']) < 32 or len(values['QA_PASSWORD']) < 12:
            raise ValueError('Configure SECRET_KEY (32+) y QA_PASSWORD (12+) en el entorno')
    elif path.is_file():
        values = json.loads(path.read_text(encoding='utf-8'))
    else:
        raise ValueError('Ejecute primero scripts/qa.py setup')
    url = make_url(values['DATABASE_URL'])
    if url.get_backend_name() != 'postgresql' or url.database not in {'sgd_test', 'sgd_evaluacion'}:
        raise ValueError('Solo PostgreSQL sgd_test o sgd_evaluacion; base original prohibida')
    os.environ.update({k: str(v) for k, v in values.items()})
    os.environ['UPLOAD_DIR'] = str(PRIVATE / 'uploads')
    os.environ['BACKUP_DIR'] = str(PRIVATE / 'backups')
    os.environ['PUBLIC_BASE_URL'] = os.environ.get('QA_BASE_URL', 'http://127.0.0.1:8765')
    return values


def pg_bin():
    selected = os.environ.get('PG_BIN')
    if selected:
        return Path(selected)
    if shutil.which('pg_ctl'):
        return Path(shutil.which('pg_ctl')).parent
    candidate = Path('C:/Program Files/PostgreSQL/18/bin')
    if candidate.is_dir():
        return candidate
    raise RuntimeError('Configure PG_BIN con initdb y pg_ctl, o QA_DATABASE_URL')


def pg(command, *args, check=True):
    # PostgreSQL on Windows inherits pipe handles into the detached server.
    # A regular file avoids waiting forever for the server to close that pipe.
    with tempfile.TemporaryFile(mode='w+', encoding='utf-8') as output:
        result = subprocess.run([str(pg_bin() / command), *map(str, args)], check=check,
                                stdout=output, stderr=output, text=True)
        output.seek(0)
        result.stderr = output.read()
        return result


def setup():
    from sqlalchemy import create_engine, text
    from sqlalchemy.engine import URL, make_url
    PRIVATE.mkdir(parents=True, exist_ok=True)
    state = PRIVATE / 'runtime.json'
    if not state.exists() and not os.getenv('QA_DATABASE_URL'):
        password = secrets.token_urlsafe(32)
        values = {'DATABASE_URL': URL.create('postgresql+psycopg2', username='postgres', password=password,
                  host='127.0.0.1', port=55432, database='sgd_evaluacion').render_as_string(hide_password=False),
                  'SECRET_KEY': secrets.token_urlsafe(48), 'QA_PASSWORD': secrets.token_urlsafe(24)}
        state.write_text(json.dumps(values), encoding='utf-8')
    values = config()
    if not os.getenv('QA_DATABASE_URL'):
        cluster = PRIVATE / 'postgres'
        if not (cluster / 'PG_VERSION').exists():
            pwfile = PRIVATE / 'init-password'
            pwfile.write_text(make_url(values['DATABASE_URL']).password, encoding='utf-8')
            try:
                result = pg('initdb', '-D', cluster, '-U', 'postgres', '--auth=scram-sha-256',
                            '--encoding=UTF8', '--locale=C', '--pwfile', pwfile, check=False)
                if result.returncode:
                    raise RuntimeError('initdb falló: ' + result.stderr[-2000:])
            finally:
                pwfile.unlink(missing_ok=True)
        if pg('pg_ctl', '-D', cluster, 'status', check=False).returncode:
            result = pg('pg_ctl', '-D', cluster, '-l', PRIVATE / 'postgres.log',
                        '-o', '-h 127.0.0.1 -p 55432', '-w', 'start', check=False)
            if result.returncode:
                raise RuntimeError('pg_ctl falló: ' + result.stderr[-2000:])
        admin_url = make_url(values['DATABASE_URL']).set(database='postgres')
        engine = create_engine(admin_url, isolation_level='AUTOCOMMIT')
        with engine.connect() as connection:
            for name in ('sgd_test', 'sgd_evaluacion'):
                if not connection.execute(text('SELECT 1 FROM pg_database WHERE datname=:n'), {'n': name}).scalar():
                    connection.execute(text('CREATE DATABASE ' + name))
        engine.dispose()
    seed()


def seed():
    values = config()
    from ejecutar_schema import migrate
    migrate(values['DATABASE_URL'])
    from app.database import SessionLocal
    from app.models import Usuario, Parroquia, Sacramento, Persona, Libro
    from app.core.security import hash_password
    from app.core.roles import ROLES
    from datetime import date
    with SessionLocal() as db:
        # Refuse to seed a database containing any non-evaluation account.
        local_admin = values.get('LOCAL_EVALUATION_ADMIN_EMAIL') if not os.getenv('QA_DATABASE_URL') else None
        if any(not u.email.endswith('@evaluacion.example.org') and
               not (u.email == local_admin and u.rol == 'administrador')
               for u in db.query(Usuario).all()):
            raise ValueError('Base con cuentas ajenas a evaluación; no se modifica')
        parishes = []
        for number in (1, 2):
            code = f'EVAL{number}'
            parish = db.query(Parroquia).filter_by(codigo=code).first()
            if not parish:
                parish = Parroquia(nombre=f'Parroquia Ficticia {number}', codigo=code, municipio='Evaluación')
                db.add(parish); db.flush()
            parishes.append(parish)
        password_hash = hash_password(values['QA_PASSWORD'])
        accounts = [(r, parishes[0].id if r in {'parroco', 'secretario_parroquial', 'consulta'} else None) for r in ROLES]
        accounts += [('parroco2', parishes[1].id), ('secretario2', parishes[1].id)]
        for account, parish_id in accounts:
            email = account + '@evaluacion.example.org'
            if not db.query(Usuario).filter_by(email=email).first():
                role = {'parroco2': 'parroco', 'secretario2': 'secretario_parroquial'}.get(account, account)
                db.add(Usuario(nombre='Evaluación ' + account, email=email, rol=role,
                               parroquia_id=parish_id, password_hash=password_hash))
        for parish in parishes:
            for sacrament in db.query(Sacramento).all():
                if not db.query(Libro).filter_by(parroquia_id=parish.id, sacramento_id=sacrament.id, numero='EVAL-1').first():
                    db.add(Libro(parroquia_id=parish.id, sacramento_id=sacrament.id, numero='EVAL-1'))
            for number in range(1, 26):
                identifier = f'FICTICIO-{parish.codigo}-{number}'
                if not db.query(Persona).filter_by(numero_identificacion=identifier).first():
                    db.add(Persona(nombres=f'Persona Ficticia {number:02}', apellidos=parish.codigo,
                                   fecha_nacimiento=date(1990, 1, 1), numero_identificacion=identifier,
                                   parroquia_id=parish.id))
        db.commit()
    print('PostgreSQL independiente migrado; 9 cuentas y 50 personas ficticias disponibles.')
    print('Credencial en QA_PASSWORD del entorno.' if os.getenv('QA_DATABASE_URL') else
          'Credencial privada: .test-data/qa/runtime.json (no distribuir ni subir a Git).')


def serve():
    config()
    import uvicorn
    from app.main import app, mount_frontend
    mount_frontend(ROOT / 'frontend' / 'build')
    uvicorn.run(app, host='127.0.0.1', port=int(os.environ.get('QA_PORT', '8765')), access_log=False)


def backend_test():
    from sqlalchemy.engine import make_url
    values = config()
    os.environ['TEST_DATABASE_URL'] = make_url(values['DATABASE_URL']).set(database='sgd_test').render_as_string(hide_password=False)
    import pytest
    raise SystemExit(pytest.main(['backend/tests', '-q', '--junitxml=.test-artifacts/qa-backend.xml']))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['setup', 'seed', 'serve', 'backend-test', 'stop'])
    args = parser.parse_args()
    if args.command == 'stop':
        pg('pg_ctl', '-D', PRIVATE / 'postgres', '-w', 'stop')
    else:
        {'setup': setup, 'seed': seed, 'serve': serve, 'backend-test': backend_test}[args.command]()
