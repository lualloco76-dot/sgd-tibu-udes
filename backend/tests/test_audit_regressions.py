"""Regressions discovered during real browser and authorization review."""
from test_api import record


def test_person_edit_is_persisted_audited_and_cannot_transfer_custody(api):
    client, headers, factory, _ = api
    item, _ = record(api)
    person_id = item['persona_id']
    payload = {'nombres': 'Persona corregida', 'apellidos': 'Ficticia', 'parroquia_id': 1,
               'lugar_nacimiento': 'Lugar corregido'}
    response = client.patch(f'/api/personas/{person_id}', headers=headers(3), json=payload)
    assert response.status_code == 200
    assert response.json()['lugar_nacimiento'] == 'Lugar corregido'
    assert client.patch(f'/api/personas/{person_id}', headers=headers(6), json=payload).status_code == 403
    assert client.patch(f'/api/personas/{person_id}', headers=headers(4), json=payload).status_code == 403
    assert client.patch(f'/api/personas/{person_id}', headers=headers(1), json={**payload, 'parroquia_id': 2}).status_code == 409
    assert client.patch(f'/api/personas/{person_id}', headers=headers(3), json={**payload, 'fecha_nacimiento': '2025-01-01'}).status_code == 422
    from app.models import Persona, Auditoria
    with factory() as db:
        assert db.get(Persona, person_id).parroquia_id == 1
        assert db.query(Auditoria).filter_by(entidad='personas', accion='MODIFICAR', entidad_id=person_id).count() == 1


def test_delegated_management_does_not_turn_global_read_into_global_write(api):
    client, headers, _, _ = api
    item, _ = record(api, uid=6)
    admin, coordinator = headers(1), headers(9)
    response = client.patch('/api/roles/secretario_general', headers=admin,
                            json={'revision': 0, 'permisos': {'canManage': True, 'canWrite': True}})
    assert response.status_code == 200
    # Global read remains available, but delegation does not confer parish custody.
    assert client.get('/api/registros/', headers=coordinator).json()[0]['id'] == item['id']
    assert client.post('/api/usuarios/6/restablecer', headers=coordinator,
                       json={'password': 'Ficticia-reinicio-2026'}).status_code == 403
    assert client.post('/api/personas/', headers=coordinator,
                       json={'nombres': 'Fuera', 'apellidos': 'Custodia', 'parroquia_id': 2}).status_code == 403
    assert client.post(f"/api/registros/{item['id']}/notas", headers=coordinator,
                       json={'texto': 'No autorizado', 'motivo': 'Prueba de custodia'}).status_code == 403


def test_cross_origin_is_denied_and_cookies_do_not_authenticate(api):
    client, headers, _, _ = api
    auth = headers(1)
    client.cookies.set('sgd-token', auth['Authorization'].removeprefix('Bearer '))
    assert client.get('/api/personas/').status_code == 401
    response = client.options('/api/personas/', headers={
        'Origin': 'https://untrusted.example.org', 'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Authorization,Content-Type'})
    assert response.status_code == 400
    assert 'access-control-allow-origin' not in response.headers
    assert response.headers.get('access-control-allow-credentials') != 'true'
    response = client.get('/api/personas/', headers=auth)
    assert response.headers['x-content-type-options'] == 'nosniff'
    assert response.headers['cache-control'] == 'no-store'
