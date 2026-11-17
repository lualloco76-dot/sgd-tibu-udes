"""Synthetic integration fixtures. Never imports the configured application database."""
import os
from pathlib import Path
import sys
import uuid

# Override legacy .env before app import; no production URL can be selected.
os.environ['DATABASE_URL'] = 'sqlite://'
os.environ['BACKUP_SCHEDULER_ENABLED'] = 'false'
os.environ['SECRET_KEY'] = 'synthetic-test-key-only-' + 'x' * 48
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from safe_database import test_database_url
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app
from app.config import settings
from app.models import Usuario, Parroquia, Sacramento
from app.core.security import hash_password

PASSWORD = 'Synthetic-test-password-2026'

@pytest.fixture(params=['sqlite', 'postgresql'])
def api(request, tmp_path, monkeypatch):
    schema = None
    base = None
    if request.param == 'postgresql':
        url = os.getenv('TEST_DATABASE_URL')
        if not url:
            pytest.skip('TEST_DATABASE_URL PostgreSQL sintética no configurada')
        url = test_database_url(url)
        base = create_engine(url)
        schema = 'api_test_' + uuid.uuid4().hex
        with base.begin() as c:
            c.execute(text('CREATE SCHEMA ' + schema))
        url = url.update_query_dict({'options': '-csearch_path=' + schema})
        engine = create_engine(url)
    else:
        engine = create_engine('sqlite:///' + (tmp_path / 'api.sqlite').as_posix(), connect_args={'check_same_thread': False})
        @event.listens_for(engine, 'connect')
        def fk(connection, _):
            connection.execute('PRAGMA foreign_keys=ON')
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    password_hash = hash_password(PASSWORD)
    with factory() as db:
        db.add_all([Parroquia(nombre=f'Parroquia Sintética {i}', codigo=f'SYN{i}') for i in (1, 2, 3)])
        db.flush()
        db.add_all([Sacramento(nombre=n) for i,n in enumerate(['Bautismo','Confirmación','Matrimonio','Defunción'],1)])
        for i, role, parish in [(1,'administrador',None),(2,'parroco',1),(3,'secretario_parroquial',1),(4,'consulta',1),(5,'parroco',2),(6,'secretario_parroquial',2),(7,'consulta',3),(8,'canciller',None),(9,'secretario_general',None),(10,'auditor',None)]:
            db.add(Usuario(nombre=f'Usuario Sintético {i}',email=f'user{i}@example.org',password_hash=password_hash,rol=role,parroquia_id=parish))
        db.commit()
    def override_db():
        with factory() as db:
            try:
                yield db
            except Exception:
                db.rollback()
                raise
    app.dependency_overrides[get_db] = override_db
    monkeypatch.setattr(settings, 'UPLOAD_DIR', str(tmp_path / 'uploads'))
    monkeypatch.setattr(settings, 'BACKUP_DIR', str(tmp_path / 'backups'))
    tokens = {}
    with TestClient(app) as client:
        def headers(uid):
            if uid not in tokens:
                with factory() as db:
                    user = db.get(Usuario, uid)
                    parish = None if user.rol in {'administrador', 'secretario_general', 'canciller', 'auditor'} else user.parroquia_id
                response = client.post('/api/auth/login', json={'email':f'user{uid}@example.org','password':PASSWORD,'parroquia_id':parish})
                assert response.status_code == 200, response.text
                tokens[uid] = response.json()['access_token']
            return {'Authorization':'Bearer ' + tokens[uid]}
        yield client, headers, factory, request.param
    app.dependency_overrides.clear()
    engine.dispose()
    if schema:
        with base.begin() as c:
            c.execute(text('DROP SCHEMA ' + schema + ' CASCADE'))
        base.dispose()
