from concurrent.futures import ThreadPoolExecutor
from app.models import Auditoria, Certificado
from test_api import record


def test_request_preparation_is_idempotent_and_preserves_permissions(api):
    c, h, factory, _ = api
    reg, _ = record(api, uid=6)
    sid = c.post('/api/solicitudes/', headers=h(3), json={'registro_id': reg['id'], 'motivo': 'Revisión documental ficticia'}).json()['id']
    data = {'registro_id': reg['id'], 'solicitud_id': sid}
    assert c.post('/api/certificados/', headers=h(6), json=data).status_code == 403
    assert c.post(f'/api/solicitudes/{sid}/decision', headers=h(6), json={'estado': 'aprobada', 'motivo': 'Referencia documental verificada'}).status_code == 200
    assert c.post('/api/certificados/', headers=h(3), json=data).status_code == 403
    assert c.post('/api/certificados/', headers=h(4), json=data).status_code == 403
    first = c.post('/api/certificados/', headers=h(6), json=data)
    second = c.post('/api/certificados/', headers=h(6), json=data)
    assert first.status_code == 201 and second.status_code == 200
    assert second.json()['id'] == first.json()['id'] and second.json()['reutilizado'] is True
    listing = c.get('/api/solicitudes/', headers=h(3)).json()[0]
    assert listing['certificado']['numero'] == first.json()['numero']
    assert listing['referencia'] == {key: reg[key] for key in ['libro', 'folio', 'numero']}
    filtered = c.get('/api/solicitudes/', headers=h(3), params={'registro_id': reg['id'], 'estado': 'aprobada'}).json()
    assert [item['id'] for item in filtered] == [sid]
    assert c.get('/api/solicitudes/', headers=h(3), params={'registro_id': reg['id'], 'estado': 'pendiente'}).json() == []
    assert c.get('/api/solicitudes/', headers=h(7), params={'registro_id': reg['id'], 'estado': 'aprobada'}).json() == []
    assert first.json()['referencia'] == listing['referencia']
    assert first.json()['parroquia'] == 'Parroquia Sintética 2'
    detail = c.get(f'/api/solicitudes/{sid}', headers=h(3)).json()
    assert detail['parroquia_origen'] == 'Parroquia Sintética 1'
    assert detail['responsable']['nombre'] == 'Usuario Sintético 6'
    assert c.get(f'/api/solicitudes/{sid}', headers=h(7)).status_code == 403
    with factory() as db:
        assert db.query(Certificado).filter_by(solicitud_id=sid).count() == 1
        assert db.query(Auditoria).filter_by(accion='PREPARAR_CERTIFICADO').count() == 1


def test_history_resolves_actor_fields_and_masks_values_for_read_only(api):
    c, h, _, _ = api
    reg, payload = record(api)
    updated = c.patch(f"/api/registros/{reg['id']}", headers=h(3), json={**payload, 'lugar': 'Lugar ficticio corregido', 'motivo': 'Corregir lugar de celebración'})
    assert updated.status_code == 200
    history = c.get(f"/api/registros/{reg['id']}/historial", headers=h(3)).json()
    event = history[0]
    assert event['responsable'] == {'nombre': 'Usuario Sintético 3', 'rol': 'secretario_parroquial'}
    from datetime import datetime
    assert datetime.fromisoformat(event['fecha']).tzinfo is not None
    assert event['cambios'] == [{'campo': 'Lugar de celebración', 'tipo': 'texto', 'anterior': None, 'nuevo': 'Lugar ficticio corregido'}]
    reader = c.get(f"/api/registros/{reg['id']}/historial", headers=h(4)).json()[0]
    assert reader['anterior'] == reader['posterior'] == {}
    assert reader['cambios'][0]['nuevo'] is None and not reader['valores_autorizados']
    assert c.get(f"/api/registros/{reg['id']}/historial", headers=h(6)).status_code == 403


def test_trace_uses_persisted_events_and_protects_external_snapshot(api):
    c, h, factory, _ = api
    reg, _ = record(api, uid=6)
    sid = c.post('/api/solicitudes/', headers=h(3), json={'registro_id': reg['id'], 'motivo': 'Solicitud ficticia de documento'}).json()['id']
    c.post(f'/api/solicitudes/{sid}/decision', headers=h(6), json={'estado': 'aprobada', 'motivo': 'Referencia documental verificada'})
    cert = c.post('/api/certificados/', headers=h(6), json={'registro_id': reg['id'], 'solicitud_id': sid}).json()
    url = f"/api/certificados/{cert['id']}/trazabilidad"
    origin = c.get(url, headers=h(3)).json()
    assert origin['persona'] is None and origin['contenido_disponible'] is False
    assert len(origin['eventos']) == 1
    assert origin['solicitud']['motivo_decision'] == 'Referencia documental verificada'
    original_name = c.get(url, headers=h(6)).json()['persona']
    person = c.patch(f"/api/personas/{reg['persona_id']}", headers=h(6), json={
        'nombres': 'Nombre actualizado', 'apellidos': 'Ficticio', 'parroquia_id': 2})
    assert person.status_code == 200
    current = c.get('/api/registros/', headers=h(6)).json()[0]
    assert current['persona']['nombres'] == 'Nombre actualizado'
    assert c.get(url, headers=h(6)).json()['persona'] == original_name
    assert c.get(url, headers=h(7)).status_code == 403
    assert c.get(url).status_code == 401
    for action in ['autorizar', 'firmar', 'anular']:
        assert c.post(f"/api/certificados/{cert['id']}/{action}", headers=h(5), json={'motivo': 'Actuación real de prueba ' + action}).status_code == 200
        trace = c.get(url, headers=h(6)).json()
        assert trace['eventos'][-1]['responsable']['nombre'] == 'Usuario Sintético 5'
        assert trace['eventos'][-1]['motivo'] == 'Actuación real de prueba ' + action
    with factory() as db:
        db.query(Auditoria).filter_by(entidad='certificados', entidad_id=cert['id'], accion='ANULAR_CERTIFICADO').delete()
        db.commit()
    trace = c.get(url, headers=h(6)).json()
    assert trace['estado'] == 'anulado'
    assert not any(e['estado'] == 'anulado' for e in trace['eventos'])


def test_concurrent_request_preparation_postgresql(api):
    import pytest
    c, h, factory, dialect = api
    if dialect != 'postgresql':
        pytest.skip('El bloqueo transaccional se verifica en PostgreSQL')
    reg, _ = record(api, uid=6)
    sid = c.post('/api/solicitudes/', headers=h(3), json={'registro_id': reg['id'], 'motivo': 'Prueba ficticia concurrente'}).json()['id']
    auth = h(6)
    c.post(f'/api/solicitudes/{sid}/decision', headers=auth, json={'estado': 'aprobada', 'motivo': 'Referencia documental verificada'})
    def prepare(_):
        return c.post('/api/certificados/', headers=auth, json={'registro_id': reg['id'], 'solicitud_id': sid})
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(prepare, range(2)))
    assert sorted(r.status_code for r in results) == [200, 201]
    assert results[0].json()['id'] == results[1].json()['id']
