from datetime import datetime, timezone, timedelta
import hashlib
from io import BytesIO
import json
from zipfile import ZipFile
import pytest
from app.config import settings
from app.models import Auditoria, Documento, Respaldo, ConfiguracionRespaldo
from app.services.respaldos import ruta, siguiente, reservar, ejecutar
from test_api import record
from pypdf import PdfWriter


def pdf():
    stream = BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    writer.write(stream)
    return stream.getvalue()


def test_role_policy_applies_to_existing_sessions_and_preserves_custody(api):
    client, headers, factory, _ = api
    admin, local, other = headers(1), headers(4), headers(7)
    assert client.post('/api/personas/', headers=local, json={'nombres': 'Persona', 'apellidos': 'Sintética'}).status_code == 403
    response = client.patch('/api/roles/consulta', headers=admin, json={'revision': 0, 'permisos': {'canWrite': True, 'canAudit': True}})
    assert response.status_code == 200
    assert response.json()['revision'] == 1
    assert client.get('/api/auth/me', headers=local).json()['permisos']['canWrite'] is True
    assert client.post('/api/personas/', headers=local, json={'nombres': 'Persona', 'apellidos': 'Sintética'}).status_code == 201
    assert client.post('/api/personas/', headers=other, json={'nombres': 'Otra', 'apellidos': 'Sintética', 'parroquia_id': 1}).status_code == 403
    assert client.get('/api/auditoria/', headers=local).status_code == 200
    assert client.patch('/api/roles/consulta', headers=admin, json={'revision': 0, 'permisos': {'canWrite': False}}).status_code == 409
    assert client.patch('/api/roles/consulta', headers=admin, json={'revision': 1, 'permisos': {'canWrite': False}}).status_code == 200
    assert client.post('/api/personas/', headers=local, json={'nombres': 'Persona', 'apellidos': 'Sintética'}).status_code == 403
    with factory() as db:
        assert db.query(Auditoria).filter_by(accion='CAMBIAR_PERMISOS').count() == 2


def test_role_policy_cannot_escalate_cargo_and_only_admin_can_edit(api):
    client, headers, _, _ = api
    assert client.get('/api/roles/', headers=headers(4)).status_code == 200
    for uid in (2, 3, 4, 8, 10):
        assert client.patch('/api/roles/consulta', headers=headers(uid), json={'revision': 0, 'permisos': {'canWrite': True}}).status_code == 403
    for role, key in [('administrador', 'canWrite'), ('consulta', 'globalRead'), ('consulta', 'canSignCert'), ('administrador', 'canApproveCuria'), ('parroco', 'canApproveCuria'), ('consulta', 'unknown')]:
        assert client.patch(f'/api/roles/{role}', headers=headers(1), json={'revision': 0, 'permisos': {key: True}}).status_code == 422
    assert client.patch('/api/roles/consulta', headers=headers(1), json={'revision': 0, 'permisos': {'canWrite': 'true'}}).status_code == 422
    assert client.patch('/api/roles/parroco', headers=headers(1), json={'revision': 0, 'permisos': {'canSignCert': False}}).status_code == 200
    assert client.get('/api/auth/me', headers=headers(2)).json()['permisos']['canSignCert'] is False


def test_backups_include_database_and_documents_verify_download_and_detect_tampering(api):
    client, headers, factory, dialect = api
    data, _ = record(api)
    uploaded = client.post('/api/documentos/', headers=headers(3), params={'registro_id': data['id'], 'tipo_documento': 'Partida'}, files={'archivo': ('sintetico.pdf', pdf(), 'application/pdf')})
    assert uploaded.status_code == 201, uploaded.text
    created = client.post('/api/respaldos/', headers=headers(1))
    assert created.status_code == 202, created.text
    id = created.json()['id']
    row = client.get('/api/respaldos/', headers=headers(1)).json()[0]
    assert row['estado'] == 'completado', row
    assert row['sha256'] and row['tamano'] > 0 and row['verificado']
    assert datetime.fromisoformat(row['creado']).tzinfo is not None
    assert datetime.fromisoformat(row['verificado']).tzinfo is not None
    assert abs(datetime.fromisoformat(row['creado']) - datetime.now(timezone.utc)) < timedelta(minutes=1)
    downloaded = client.get(f'/api/respaldos/{id}/descargar', headers=headers(1))
    assert downloaded.status_code == 200
    assert hashlib.sha256(downloaded.content).hexdigest() == row['sha256']
    with ZipFile(BytesIO(downloaded.content)) as archive:
        manifest = json.loads(archive.read('manifiesto.json'))
        assert manifest['motor'] == dialect
        assert len([name for name in archive.namelist() if name.startswith('documentos/')]) == 1
        for name, checksum in manifest['archivos'].items():
            assert hashlib.sha256(archive.read(name)).hexdigest() == checksum
    assert client.post(f'/api/respaldos/{id}/verificar', headers=headers(1)).status_code == 200
    with factory() as db:
        assert db.get(ConfiguracionRespaldo, 1).en_curso is False
    ruta(id).write_bytes(b'corrupt-synthetic-archive')
    assert client.post(f'/api/respaldos/{id}/verificar', headers=headers(1)).status_code == 409
    assert client.get(f'/api/respaldos/{id}/descargar', headers=headers(1)).status_code == 409


def test_backup_failure_is_visible_releases_lock_and_never_leaks_paths(api, monkeypatch):
    from app.services import respaldos
    client, headers, factory, _ = api
    def fail(*args):
        raise OSError('synthetic-secret-password-and-private-path')
    monkeypatch.setattr(respaldos, 'volcar', fail)
    assert client.post('/api/respaldos/', headers=headers(1)).status_code == 202
    row = client.get('/api/respaldos/', headers=headers(1)).json()[0]
    assert row['estado'] == 'fallido'
    assert 'synthetic-secret' not in row['error']
    with factory() as db:
        assert db.get(ConfiguracionRespaldo, 1).en_curso is False
    assert client.post('/api/respaldos/', headers=headers(1)).status_code == 202


def test_backup_endpoints_are_admin_only_and_locked_while_running(api):
    client, headers, factory, _ = api
    for uid in (2, 3, 4, 8, 9, 10):
        for method, path in [('get', '/api/respaldos/'), ('post', '/api/respaldos/'), ('get', '/api/respaldos/configuracion'), ('get', '/api/respaldos/unknown/descargar'), ('post', '/api/respaldos/unknown/verificar')]:
            assert getattr(client, method)(path, headers=headers(uid)).status_code == 403
    with factory() as db:
        reservar(db)
    assert client.post('/api/respaldos/', headers=headers(1)).status_code == 409


def test_scheduled_backup_claim_is_unique_and_catches_up_after_shutdown(api, monkeypatch):
    client, headers, factory, _ = api
    monkeypatch.setattr(settings, 'BACKUP_SCHEDULER_ENABLED', True)
    response = client.patch('/api/respaldos/configuracion', headers=headers(1), json={'frecuencia': 'diario', 'hora': 2})
    assert response.status_code == 200
    assert response.json()['proximo'] and response.json()['zona_horaria'] == 'America/Bogota'
    with factory() as db:
        config = db.get(ConfiguracionRespaldo, 1)
        config.proximo = datetime.now(timezone.utc) - timedelta(days=2)
        db.commit()
        job = reservar(db, origen='automatico', scheduled=True)
        id = job.id
    with factory() as db:
        assert reservar(db, origen='automatico', scheduled=True) is None
    ejecutar(factory, id)
    with factory() as db:
        assert db.get(Respaldo, id).estado == 'completado'
        assert reservar(db, origen='automatico', scheduled=True) is None
    assert client.patch('/api/respaldos/configuracion', headers=headers(1), json={'frecuencia': 'diario', 'hora': 24}).status_code == 422
    response = client.patch('/api/respaldos/configuracion', headers=headers(1), json={'frecuencia': 'manual', 'hora': 2})
    assert response.status_code == 200 and response.json()['proximo'] is None


def test_schedule_uses_colombia_time_and_sunday():
    now = datetime(2026, 11, 2, 6, 0, tzinfo=timezone.utc)
    assert siguiente('diario', 2, now) == datetime(2026, 11, 2, 7, 0, tzinfo=timezone.utc)
    assert siguiente('semanal', 2, now) == datetime(2026, 11, 8, 7, 0, tzinfo=timezone.utc)
    assert siguiente('manual', 2, now) is None


def test_abandoned_backup_is_recovered_without_releasing_a_live_lease(api):
    client, headers, factory, _ = api
    with factory() as db:
        old = reservar(db)
        old_id = old.id
    assert client.get('/api/respaldos/configuracion', headers=headers(1)).json()['en_curso'] is True
    with factory() as db:
        db.get(ConfiguracionRespaldo, 1).latido = datetime.now(timezone.utc) - timedelta(minutes=6)
        db.commit()
    assert client.get('/api/respaldos/configuracion', headers=headers(1)).json()['en_curso'] is False
    with factory() as db:
        assert db.get(Respaldo, old_id).estado == 'fallido'
        assert 'interrumpió' in db.get(Respaldo, old_id).error
        new = reservar(db)
        new_id = new.id
    # A stale task cannot release the reservation owned by its replacement.
    ejecutar(factory, old_id)
    with factory() as db:
        assert db.get(ConfiguracionRespaldo, 1).trabajo_id == new_id
        assert db.get(ConfiguracionRespaldo, 1).en_curso is True
