from datetime import date, timedelta
from io import BytesIO
import pytest
from pypdf import PdfReader
from app.models import Usuario, Auditoria, Certificado, NotaMarginal, Sesion, Parroquia
from app.core.security import hash_password, verificar_password, crear_token_acceso
from app.config import settings
from fastapi import HTTPException
from conftest import PASSWORD


def test_temporary_password_blocks_modules_until_replacement(api):
    client, headers, factory, _ = api
    auth = headers(1)
    with factory() as db:
        db.get(Usuario, 1).debe_cambiar_password = True
        db.commit()
    assert client.get('/api/auth/me', headers=auth).json()['debe_cambiar_password'] is True
    assert client.get('/api/personas/', headers=auth).status_code == 403
    same = client.post('/api/auth/change-password', headers=auth, json={'actual': PASSWORD, 'nueva': PASSWORD})
    assert same.status_code == 422
    changed = client.post('/api/auth/change-password', headers=auth, json={'actual': PASSWORD, 'nueva': 'Ficticia-nueva-individual-2026'})
    assert changed.status_code == 200
    assert client.get('/api/auth/me', headers=auth).status_code == 401
    login = client.post('/api/auth/login', json={'email': 'user1@example.org', 'password': 'Ficticia-nueva-individual-2026', 'parroquia_id': None})
    assert login.status_code == 200
    fresh = {'Authorization': 'Bearer ' + login.json()['access_token']}
    assert not client.get('/api/auth/me', headers=fresh).json()['debe_cambiar_password']
    assert client.get('/api/personas/', headers=fresh).status_code == 200


def test_login_catalog_is_public_minimal_and_only_active(api):
    client, _, factory, _ = api
    with factory() as db:
        db.get(Parroquia, 2).activa = False
        db.commit()
    response = client.get('/api/auth/parroquias')
    assert response.status_code == 200
    rows = response.json()
    assert {row['id'] for row in rows} == {1, 3}
    assert all(set(row) == {'id', 'nombre', 'codigo'} for row in rows)
    assert [row['nombre'] for row in rows] == sorted(row['nombre'] for row in rows)


def test_parish_login_requires_assigned_context_without_changing_custody(api):
    client, _, factory, _ = api
    credentials = {'email': 'user3@example.org', 'password': PASSWORD}
    for context in ({}, {'parroquia_id': None}, {'parroquia_id': 2}, {'parroquia_id': 999999}):
        response = client.post('/api/auth/login', json={**credentials, **context})
        assert response.status_code == 401 and 'access_token' not in response.json()
    with factory() as db:
        assert db.query(Sesion).count() == 0
        assert db.get(Usuario, 3).parroquia_id == 1
        assert db.get(Usuario, 3).intentos_fallidos == 4
    response = client.post('/api/auth/login', json={**credentials, 'parroquia_id': 1})
    assert response.status_code == 200
    identity = client.get('/api/auth/me', headers={'Authorization': 'Bearer ' + response.json()['access_token']}).json()
    assert identity['parroquia_id'] == 1 and identity['rol'] == 'secretario_parroquial'
    with factory() as db:
        assert db.get(Usuario, 3).intentos_fallidos == 0


def test_diocesan_login_uses_diocesan_context_and_parish_ids_are_strict(api):
    client, _, _, _ = api
    for uid in (1, 8, 9, 10):
        credentials = {'email': f'user{uid}@example.org', 'password': PASSWORD}
        assert client.post('/api/auth/login', json={**credentials, 'parroquia_id': 1}).status_code == 401
        assert client.post('/api/auth/login', json={**credentials, 'parroquia_id': None}).status_code == 200
    for invalid_id in (0, -1, True, '1', 1.5):
        response = client.post('/api/auth/login', json={'email': 'user3@example.org', 'password': PASSWORD, 'parroquia_id': invalid_id})
        assert response.status_code == 422


def test_eight_character_passwords_create_reset_change_and_revoke_sessions(api):
    client, headers, _, _ = api
    admin = headers(1)
    account = {'nombre': 'Prueba ocho caracteres', 'email': 'eight-characters@example.org', 'rol': 'consulta', 'parroquia_id': 1}
    assert client.post('/api/usuarios/', headers=admin, json={**account, 'password': 'abcdefg'}).status_code == 422
    created = client.post('/api/usuarios/', headers=admin, json={**account, 'password': 'abcdefgh'})
    assert created.status_code == 201
    user_id = created.json()['id']

    def login_with(password):
        response = client.post('/api/auth/login', json={'email': account['email'], 'password': password, 'parroquia_id': 1})
        assert response.status_code == 200
        return {'Authorization': 'Bearer ' + response.json()['access_token']}

    old_session = login_with('abcdefgh')
    assert client.post(f'/api/usuarios/{user_id}/restablecer', headers=admin, json={'password': '1234567'}).status_code == 422
    assert client.post(f'/api/usuarios/{user_id}/restablecer', headers=admin, json={'password': '12345678'}).status_code == 200
    assert client.get('/api/auth/me', headers=old_session).status_code == 401
    new_session = login_with('12345678')
    assert client.post('/api/auth/change-password', headers=new_session, json={'actual': '12345678', 'nueva': 'ijklmno'}).status_code == 422
    assert client.post('/api/auth/change-password', headers=new_session, json={'actual': '12345678', 'nueva': 'ijklmnop'}).status_code == 200
    assert client.get('/api/auth/me', headers=new_session).status_code == 401
    assert client.get('/api/auth/me', headers=login_with('ijklmnop')).json()['id'] == user_id
    with pytest.raises(HTTPException):
        hash_password('1234567')
    assert verificar_password('abcdefgh', hash_password('abcdefgh'))


def test_dashboard_preserves_tenant_scope_and_audit_permissions(api):
    client, headers, _, _ = api
    first, _ = record(api, uid=3, number='PANEL1')
    second, _ = record(api, uid=6, number='PANEL2')
    local = client.get('/api/reportes', headers=headers(3)).json()
    assert local['registros'] == 1 and local['personas'] == 1
    assert {item['id'] for item in local['ultimas_partidas']} == {first['id']}
    assert local['actividad_reciente'] == [] and local['usuarios_activos'] is None
    other = client.get('/api/reportes', headers=headers(6)).json()
    assert {item['id'] for item in other['ultimas_partidas']} == {second['id']}
    reader = client.get('/api/reportes', headers=headers(4)).json()
    assert reader['actividad_reciente'] == []
    auditor = client.get('/api/reportes', headers=headers(10)).json()
    assert auditor['registros'] == 2 and auditor['ultimas_partidas'] == []
    assert auditor['actividad_reciente']
    global_view = client.get('/api/reportes', headers=headers(1)).json()
    assert global_view['registros'] == 2 and len(global_view['actividad_mensual']) == 6
    assert {item['id'] for item in global_view['ultimas_partidas']} == {first['id'], second['id']}


def test_directory_metadata_validation_and_clear_fields(api):
    client, headers, _, _ = api
    payload = {'nombre': 'Catedral sintética', 'codigo': 'DIR_TEST', 'tipo': 'catedral', 'municipio': 'Tibú', 'localidad': 'Centro', 'direccion': 'Calle de prueba'}
    response = client.post('/api/parroquias/', headers=headers(1), json=payload)
    assert response.status_code == 201
    row = response.json()
    assert all(row[key] == value for key, value in payload.items())
    filtered = client.get('/api/parroquias/', headers=headers(1), params={'q': 'Tibú', 'activa': True}).json()
    assert {item['id'] for item in filtered} == {row['id']}
    assert client.get('/api/parroquias/', headers=headers(1), params={'q': 'DIR_TEST', 'activa': False}).json() == []
    assert client.patch(f"/api/parroquias/{row['id']}", headers=headers(3), json={'municipio': 'Otro'}).status_code == 403
    updated = client.patch(f"/api/parroquias/{row['id']}", headers=headers(1), json={'localidad': None, 'direccion': None})
    assert updated.status_code == 200 and updated.json()['localidad'] is None and updated.json()['direccion'] is None
    assert client.patch(f"/api/parroquias/{row['id']}", headers=headers(1), json={'tipo': 'invalido'}).status_code == 422
    public = client.get('/api/auth/parroquias').json()
    assert all(set(item) == {'id', 'nombre', 'codigo'} for item in public)


def person(api, uid=3, suffix='Uno'):
    client, headers, _, _ = api
    r = client.post('/api/personas/', headers=headers(uid), json={'nombres':'Persona Sintética','apellidos':suffix,'fecha_nacimiento':'1990-01-01'})
    assert r.status_code == 201, r.text
    return r.json()


def record(api, uid=3, sacrament=1, number='1', data=None):
    client, headers, _, _ = api
    p = person(api, uid, number)
    payload = {'persona_id':p['id'],'sacramento_id':sacrament,'fecha_celebracion':'2020-06-15','libro':'1','folio':'2','numero':number,'datos':data or {}}
    # Books are explicit institutional configuration.
    client.post('/api/libros/', headers=headers(uid), json={'sacramento_id':sacrament,'numero':'1'})
    r = client.post('/api/registros/', headers=headers(uid), json=payload)
    assert r.status_code == 201, r.text
    return r.json(), payload


def test_integral_approval_pdf_qr_and_audit(api, tmp_path):
    c, h, factory, _ = api
    reg, _ = record(api, 6)
    # Origin discovers only archival references, never identities.
    discovery = c.get('/api/registros/buscar', headers=h(3), params={'parroquia_id':2,'libro':'1','folio':'2','numero':'1'})
    assert discovery.status_code == 200
    assert discovery.json()[0]['id'] == reg['id']
    assert 'persona' not in discovery.json()[0]
    assert c.get('/api/registros/', headers=h(3)).json() == []
    request = c.post('/api/solicitudes/', headers=h(3), json={'registro_id':reg['id'],'motivo':'Expedición sintética de prueba'})
    assert request.status_code == 201, request.text
    sid = request.json()['id']
    assert c.post(f'/api/solicitudes/{sid}/decision', headers=h(3), json={'estado':'aprobada','motivo':'No tiene custodia'}).status_code == 403
    decision = c.post(f'/api/solicitudes/{sid}/decision', headers=h(6), json={'estado':'aprobada','motivo':'Referencia documental verificada'})
    assert decision.status_code == 200
    assert decision.json()['responsable_id'] == 6 and decision.json()['fecha_decision']
    certificate = c.post('/api/certificados/', headers=h(6), json={'registro_id':reg['id'],'solicitud_id':sid})
    assert certificate.status_code == 201, certificate.text
    cert = certificate.json()
    assert cert['estado'] == 'preparado'
    assert c.get(f"/api/certificados/{cert['id']}/pdf", headers=h(3)).status_code == 409
    assert c.get('/api/certificados/verificar/' + cert['codigo_verificacion']).json()['valido'] is False
    assert c.post(f"/api/certificados/{cert['id']}/autorizar", headers=h(5), json={}).status_code == 200
    assert c.post(f"/api/certificados/{cert['id']}/firmar", headers=h(5), json={}).status_code == 200
    response = c.get(f"/api/certificados/{cert['id']}/pdf", headers=h(3))
    assert response.status_code == 200 and response.headers['content-type'] == 'application/pdf'
    pdf = PdfReader(BytesIO(response.content))
    contents = '\n'.join(p.extract_text() for p in pdf.pages)
    assert 'Persona Sintética' in contents and 'Libro' in contents and cert['numero'] in contents
    assert cert['codigo_verificacion'] in ''.join(contents.split())
    verify = c.get('/api/certificados/verificar/' + cert['codigo_verificacion'])
    assert verify.status_code == 200 and verify.json()['valido'] is True
    assert set(verify.json()) == {'valido','numero','fecha_emision','parroquia'}
    # Local synthetic output permits independent visual and QR inspection.
    (tmp_path / 'certificado.pdf').write_bytes(response.content)
    assert c.get(f"/api/certificados/{cert['id']}/pdf",headers=h(7)).status_code == 403
    assert c.post('/api/certificados/',headers=h(3),json={'registro_id':reg['id'],'solicitud_id':sid}).status_code == 403
    assert len(c.get('/api/certificados/',headers=h(3)).json()) == 1
    with factory() as db:
        assert db.get(Certificado,cert['id']).instantanea['persona'].startswith('Persona Sintética')
        actions = {a.accion for a in db.query(Auditoria).all()}
        assert {'INICIO_SESION','CREAR','SOLICITAR','APROBAR','PREPARAR_CERTIFICADO','AUTORIZAR_CERTIFICADO','FIRMAR_CERTIFICADO','DESCARGAR_CERTIFICADO'} <= actions
    c.post('/api/auth/logout', headers=h(3))
    assert c.get('/api/auth/me',headers=h(3)).status_code == 401


def test_rejection_final_state_and_download_denial(api):
    c,h,_,_ = api
    reg,_ = record(api,6)
    sid = c.post('/api/solicitudes/',headers=h(3),json={'registro_id':reg['id'],'motivo':'Solicitud para rechazo'}).json()['id']
    assert c.post('/api/certificados/',headers=h(6),json={'registro_id':reg['id'],'solicitud_id':sid}).status_code == 403
    assert c.post(f'/api/solicitudes/{sid}/decision',headers=h(6),json={'estado':'rechazada','motivo':'Referencia no autorizada'}).status_code == 200
    assert c.post(f'/api/solicitudes/{sid}/decision',headers=h(6),json={'estado':'aprobada','motivo':'Cambio inválido posterior'}).status_code == 409
    assert c.post(f'/api/solicitudes/{sid}/decision',headers=h(6),json={'estado':'pendiente','motivo':'Transición inválida'}).status_code == 422
    assert c.post('/api/certificados/',headers=h(6),json={'registro_id':reg['id'],'solicitud_id':sid}).status_code == 403
    cert = c.post('/api/certificados/',headers=h(6),json={'registro_id':reg['id']}).json()
    assert c.get(f"/api/certificados/{cert['id']}/pdf",headers=h(3)).status_code == 409
    assert c.get('/api/certificados/',headers=h(3)).json() == []


@pytest.mark.parametrize('sacrament',[1,2,3,4])
def test_four_record_types_and_history(api,sacrament):
    c,h,factory,_ = api
    data = {}
    if sacrament == 3:
        data['conyuge_persona_id'] = person(api)['id']
    if sacrament == 4:
        data['fecha_defuncion'] = '2020-06-14'
    reg,payload = record(api,sacrament=sacrament,data=data)
    payload.update({'notas':'Nota de corrección sintética','motivo':'Corrección documental autorizada'})
    changed = c.patch(f"/api/registros/{reg['id']}",headers=h(3),json=payload)
    assert changed.status_code == 200, changed.text
    history = c.get(f"/api/registros/{reg['id']}/historial",headers=h(3)).json()
    assert len(history) == 1 and history[0]['anterior']['notas'] is None
    assert history[0]['posterior']['notas'] == payload['notas']
    assert c.get(f"/api/registros/{reg['id']}/historial",headers=h(6)).status_code == 403
    # Issued snapshot survives later changes.
    cert = c.post('/api/certificados/',headers=h(3),json={'registro_id':reg['id']}).json()
    payload['notas'] = 'Una segunda corrección'
    c.patch(f"/api/registros/{reg['id']}",headers=h(3),json=payload)
    with factory() as db:
        assert db.get(Certificado,cert['id']).instantanea['notas'] != payload['notas']
        assert db.query(NotaMarginal).count() == 2


def test_roles_isolation_user_administration(api):
    c,h,_,_ = api
    reg,payload = record(api)
    assert c.post('/api/personas/',headers=h(4),json={'nombres':'Intento','apellidos':'Consulta'}).status_code == 403
    assert c.post('/api/personas/',headers=h(3),json={'nombres':'Intento','apellidos':'Ajeno','parroquia_id':2}).status_code == 403
    assert c.patch(f"/api/registros/{reg['id']}",headers=h(6),json={**payload,'motivo':'Intento fuera de custodia'}).status_code == 403
    assert c.get('/api/usuarios/',headers=h(3)).status_code == 403
    assert c.post('/api/usuarios/',headers=h(2),json={'nombre':'Escalada','email':'escalada@example.org','password':PASSWORD,'rol':'administrador'}).status_code == 403
    assert c.patch('/api/usuarios/6',headers=h(2),json={'activo':False}).status_code == 403
    assert c.patch('/api/usuarios/3',headers=h(2),json={'parroquia_id':2}).status_code == 403
    assert c.patch('/api/usuarios/2',headers=h(2),json={'activo':False}).status_code == 403
    assert c.patch('/api/usuarios/1',headers=h(1),json={'activo':False}).status_code == 409
    assert c.get('/api/auditoria/',headers=h(4)).status_code == 403
    assert c.post('/api/parroquias/',headers=h(2),json={'nombre':'No permitida','codigo':'NO'}).status_code == 403
    assert all(a['parroquia_id'] == 1 for a in c.get('/api/auditoria/',headers=h(2)).json())


def test_lockout_recovery_and_session_invalidation(api):
    c,h,factory,_ = api
    old = h(3)
    for _ in range(5):
        assert c.post('/api/auth/login',json={'email':'user3@example.org','password':'incorrecta'}).status_code == 401
    assert c.post('/api/auth/login',json={'email':'user3@example.org','password':PASSWORD}).status_code == 429
    assert c.post('/api/usuarios/3/restablecer',headers=h(2),json={'password':PASSWORD}).status_code == 200
    assert c.get('/api/auth/me',headers=old).status_code == 401
    new = c.post('/api/auth/login',json={'email':'user3@example.org','password':PASSWORD,'parroquia_id':1}).json()['access_token']
    current = {'Authorization':'Bearer '+new}
    assert c.get('/api/auth/me', headers=current).json()['debe_cambiar_password'] is True
    assert c.get('/api/personas/', headers=current).status_code == 403
    assert c.post('/api/auth/change-password',headers=current,json={'actual':PASSWORD,'nueva':'Nueva-password-sintetica'}).status_code == 200
    assert c.get('/api/auth/me',headers=current).status_code == 401
    assert c.post('/api/auth/login',json={'email':'user3@example.org','password':PASSWORD}).status_code == 401
    with factory() as db:
        row = db.get(Usuario,3)
        assert verificar_password('Nueva-password-sintetica',row.password_hash)
        assert PASSWORD not in row.password_hash
        assert all(PASSWORD not in (a.detalle or '') for a in db.query(Auditoria).all())


def test_revocation_deactivation_and_tokens(api):
    c,h,_,_ = api
    token = h(3)
    assert c.patch('/api/usuarios/3',headers=h(2),json={'activo':False}).status_code == 200
    assert c.get('/api/auth/me',headers=token).status_code == 401
    assert c.post('/api/auth/login',json={'email':'user3@example.org','password':PASSWORD}).status_code == 401
    for token in ['bad.token.value',crear_token_acceso({'sub':'2','jti':'inventada','ver':0}),crear_token_acceso({'sub':'2','jti':'inventada','ver':0},timedelta(seconds=-1))]:
        assert c.get('/api/auth/me',headers={'Authorization':'Bearer '+token}).status_code == 401
    assert c.get('/api/auth/me').status_code == 401
    h(2)
    assert c.patch('/api/parroquias/1',headers=h(1),json={'activa':False}).status_code == 200
    assert c.get('/api/auth/me',headers=h(2)).status_code == 401


def test_validation_duplicates_and_search(api):
    c,h,_,_ = api
    reg,payload = record(api)
    assert c.post('/api/registros/',headers=h(3),json=payload).status_code == 409
    assert c.post('/api/registros/',headers=h(3),json={**payload,'fecha_celebracion':str(date.today()+timedelta(days=3))}).status_code == 422
    assert c.post('/api/registros/',headers=h(3),json={**payload,'fecha_celebracion':'1980-01-01'}).status_code == 422
    assert c.post('/api/registros/',headers=h(3),json={**payload,'persona_id':999999}).status_code == 422
    assert c.post('/api/registros/',headers=h(3),json={**payload,'sacramento_id':3}).status_code == 422
    assert c.post('/api/registros/',headers=h(3),json={**payload,'datos':{'fecha_defuncion':'imposible'}}).status_code == 422
    assert c.get('/api/registros/',headers=h(3),params={'q':'Sintética','libro':'1','desde':'2020-01-01','hasta':'2020-12-31'}).json()[0]['id'] == reg['id']
    assert c.get('/api/registros/',headers=h(3),params={'limit':0}).status_code == 422
    assert c.get('/api/registros/',headers=h(3),params={'q':"' OR 1=1 --"}).json() == []
    assert c.get('/api/personas/',headers=h(6)).json() == []
    assert c.post('/api/solicitudes/',headers=h(3),json={'registro_id':reg['id'],'motivo':'Misma parroquia'}).status_code == 422


def test_upload_download_integrity_and_traversal(api):
    c,h,factory,_ = api
    reg,_ = record(api)
    # Reuse a PDF emitted by the actual service.
    cert = c.post('/api/certificados/',headers=h(3),json={'registro_id':reg['id']}).json()
    assert c.post(f"/api/certificados/{cert['id']}/autorizar",headers=h(2),json={}).status_code == 200
    assert c.post(f"/api/certificados/{cert['id']}/firmar",headers=h(2),json={}).status_code == 200
    pdf = c.get(f"/api/certificados/{cert['id']}/pdf",headers=h(3)).content
    params = {'registro_id':reg['id'],'tipo_documento':'Partida'}
    assert c.post('/api/documentos/',headers=h(3),params=params,files={'archivo':('x.pdf',b'no es pdf','application/pdf')}).status_code == 422
    uploaded = c.post('/api/documentos/',headers=h(3),params=params,files={'archivo':('../../partida.pdf',pdf,'application/pdf')})
    assert uploaded.status_code == 201, uploaded.text
    doc = uploaded.json()
    assert 'ruta_archivo' not in doc and doc['nombre_archivo'] == 'partida.pdf'
    listed = c.get('/api/documentos/', headers=h(3)).json()
    assert listed[0]['referencia'] == {key: reg[key] for key in ['libro', 'folio', 'numero']}
    assert c.get(f"/api/documentos/{doc['id']}/descargar",headers=h(3)).content == pdf
    assert c.get(f"/api/documentos/{doc['id']}/descargar",headers=h(6)).status_code == 403
    from app.models import Documento
    from pathlib import Path
    with factory() as db:
        path = Path(db.get(Documento,doc['id']).ruta_archivo)
    path.write_bytes(b'contenido alterado')
    assert c.get(f"/api/documentos/{doc['id']}/descargar",headers=h(3)).status_code == 409


def test_headers_cors_and_public_privacy(api):
    c,h,_,_ = api
    response = c.get('/api/registros/',headers=h(3))
    assert response.headers['cache-control'] == 'no-store'
    assert response.headers['x-content-type-options'] == 'nosniff'
    for origin, allowed in [('http://localhost:3000',True),('https://untrusted.example.test',False)]:
        r = c.options('/api/registros/',headers={'Origin':origin,'Access-Control-Request-Method':'POST'})
        assert ('access-control-allow-origin' in r.headers) is allowed
    assert c.get('/api/certificados/verificar/inventado').status_code == 404


def test_notes_and_controlled_legacy_custody(api):
    c,h,factory,_ = api
    reg,_ = record(api)
    assert c.post(f"/api/registros/{reg['id']}/notas",headers=h(3),json={'texto':'Nota aditiva sintética','motivo':'Información documental nueva'}).status_code == 201
    assert c.post(f"/api/registros/{reg['id']}/notas",headers=h(6),json={'texto':'Nota ajena','motivo':'Intento indebido de anotación'}).status_code == 403
    assert c.post(f"/api/registros/{reg['id']}/custodia",headers=h(1),json={'parroquia_id':2,'motivo':'Transferencia no autorizada'}).status_code == 409
    from app.models import Persona, RegistroSacramental
    with factory() as db:
        p=Persona(nombres='Persona Histórica',apellidos='Sintética',email='dato legado no validado')
        db.add(p);db.flush()
        old=RegistroSacramental(persona_id=p.id,sacramento_id=1,datos={})
        db.add(old);db.commit();old_id=old.id
    result=c.get('/api/registros/',headers=h(1))
    assert result.status_code==200
    assert any(r['id']==old_id and r['fecha_celebracion'] is None for r in result.json())
    params={'parroquia_id':1,'motivo':'Custodia documentada por archivo institucional'}
    assert c.post(f'/api/registros/{old_id}/custodia',headers=h(2),json=params).status_code==403
    assert c.post(f'/api/registros/{old_id}/custodia',headers=h(1),json=params).status_code==200
    assert any(r['id']==old_id for r in c.get('/api/registros/',headers=h(3)).json())
    assert c.post('/api/certificados/',headers=h(3),json={'registro_id':old_id}).status_code==422
    assert c.post(f'/api/registros/{old_id}/custodia',headers=h(1),json=params).status_code==409
    with factory() as db:
        assert db.query(NotaMarginal).filter_by(registro_id=old_id).count()==1
        assert db.get(Persona,p.id).parroquia_id==1


def test_concurrent_request_decisions(api):
    from concurrent.futures import ThreadPoolExecutor
    c,h,_,_=api
    reg,_=record(api,6)
    sid=c.post('/api/solicitudes/',headers=h(3),json={'registro_id':reg['id'],'motivo':'Prueba sintética de concurrencia'}).json()['id']
    credentials=h(6)
    def decide(state):
        return c.post(f'/api/solicitudes/{sid}/decision',headers=credentials,json={'estado':state,'motivo':'Decisión concurrente sintética'}).status_code
    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses=list(executor.map(decide,['aprobada','rechazada']))
    assert sorted(statuses)==[200,409]


def test_configuration_and_sanitized_errors(api,monkeypatch):
    c,h,_,_=api
    assert c.get('/api/auth/me',headers=h(3)).status_code==200
    response=c.post('/api/usuarios/',headers=h(2),json={'nombre':'Sintético','email':'invalido','password':'secreto-corto','rol':'consulta'})
    assert response.status_code==422 and 'secreto-corto' not in response.text and 'input' not in response.text
    monkeypatch.setattr(settings,'SECRET_KEY','short')
    assert c.post('/api/auth/login',json={'email':'user3@example.org','password':PASSWORD,'parroquia_id':1}).status_code==503
    with pytest.raises(HTTPException):
        hash_password('weak')
    with pytest.raises(HTTPException):
        hash_password('á'*50)
    assert not verificar_password('invalid','not-a-hash')


def test_administrative_catalogs_users_and_reports(api):
    c,h,factory,_=api
    parish=c.post('/api/parroquias/',headers=h(1),json={'nombre':'Parroquia Nueva Sintética','codigo':'NUEVA'})
    assert parish.status_code==201,parish.text
    pid=parish.json()['id']
    assert c.post('/api/parroquias/',headers=h(1),json={'nombre':'Parroquia Duplicada','codigo':'NUEVA'}).status_code==409
    assert c.patch(f'/api/parroquias/{pid}',headers=h(1),json={'nombre':'Parroquia Sintética Actualizada'}).status_code==200
    password='  contraseña-sintética segura  '
    created=c.post('/api/usuarios/',headers=h(1),json={'nombre':'Párroco Sintético','email':'NewUser@example.org','password':password,'rol':'parroco','parroquia_id':pid})
    assert created.status_code==201,created.text
    uid=created.json()['id']
    assert created.json()['email']=='newuser@example.org' and 'password_hash' not in created.json()
    assert c.post('/api/auth/login',json={'email':'NEWUSER@EXAMPLE.ORG','password':password,'parroquia_id':pid}).status_code==200
    assert c.post('/api/usuarios/',headers=h(2),json={'nombre':'Consulta Nueva','email':'consulta-nueva@example.org','password':PASSWORD,'rol':'consulta'}).status_code==201
    assert c.patch(f'/api/usuarios/{uid}',headers=h(1),json={'activo':False}).status_code==200
    assert c.post('/api/auth/login',json={'email':'newuser@example.org','password':password}).status_code==401
    reg,_=record(api)
    report=c.get('/api/reportes',headers=h(3))
    assert report.status_code==200 and report.json()['registros']==1 and report.json()['por_sacramento']['Bautismo']==1
    assert c.get('/api/reportes',headers=h(6)).json()['registros']==0
    assert c.get('/api/libros/',headers=h(6)).json()==[]
    assert c.post('/api/libros/',headers=h(3),json={'sacramento_id':1,'numero':'1'}).status_code==409
    assert c.post('/api/libros/',headers=h(3),json={'sacramento_id':999999,'numero':'2'}).status_code==422
    assert c.patch(f'/api/parroquias/{pid}',headers=h(1),json={'activa':False}).status_code==200
    with factory() as db:
        assert db.get(Usuario,uid).parroquia_id==pid
        assert not db.get(Parroquia,pid).activa


def test_upload_size_storage_boundary_and_book_validation(api,monkeypatch,tmp_path):
    c,h,factory,_=api
    p=person(api)
    payload={'persona_id':p['id'],'sacramento_id':1,'fecha_celebracion':'2020-06-15','libro':'No configurado','folio':'1','numero':'1'}
    assert c.post('/api/registros/',headers=h(3),json=payload).status_code==422
    reg,_=record(api)
    monkeypatch.setattr(settings,'MAX_UPLOAD_BYTES',32)
    r=c.post('/api/documentos/',headers=h(3),params={'registro_id':reg['id'],'tipo_documento':'Partida'},files={'archivo':('grande.pdf',b'%PDF-'+b'x'*64+b'%%EOF','application/pdf')})
    assert r.status_code==413
    from app.core.storage import ruta_segura
    outside=tmp_path/'outside.pdf'
    outside.write_bytes(b'%PDF-1.4 %%EOF')
    with pytest.raises(HTTPException) as exc:
        ruta_segura(str(outside))
    assert exc.value.status_code==404
    assert c.get('/api/registros/',headers=h(3),params={'desde':'2021-01-01','hasta':'2020-01-01'}).status_code==422


def test_rejects_structurally_invalid_active_and_encrypted_pdf(api):
    from pypdf import PdfWriter
    c,h,_,_=api
    reg,_=record(api)
    params={'registro_id':reg['id'],'tipo_documento':'Prueba'}
    payloads=[b'%PDF-1.4\nobjeto invalido\n%%EOF']
    writer=PdfWriter();writer.add_blank_page(width=100,height=100);writer.add_js('app.alert("synthetic-test")')
    output=BytesIO();writer.write(output);payloads.append(output.getvalue())
    writer=PdfWriter();writer.add_blank_page(width=100,height=100);writer.encrypt('synthetic-only')
    output=BytesIO();writer.write(output);payloads.append(output.getvalue())
    for payload in payloads:
        assert c.post('/api/documentos/',headers=h(3),params=params,files={'archivo':('prueba.pdf',payload,'application/pdf')}).status_code==422


def test_certificate_authorization_separates_prepare_authorize_sign(api):
    c, h, factory, _ = api
    reg, _ = record(api)  # parroquia 1
    # Secretario parroquial prepara (genera técnicamente) el certificado.
    cert = c.post('/api/certificados/', headers=h(3), json={'registro_id': reg['id']}).json()
    assert cert['estado'] == 'preparado'
    # El secretario parroquial no puede autorizar ni firmar.
    assert c.post(f"/api/certificados/{cert['id']}/autorizar", headers=h(3), json={}).status_code == 403
    assert c.post(f"/api/certificados/{cert['id']}/firmar", headers=h(3), json={}).status_code == 403
    # El administrador técnico no adquiere facultades eclesiásticas.
    assert c.post(f"/api/certificados/{cert['id']}/autorizar", headers=h(1), json={}).status_code == 403
    # El párroco custodio autoriza y firma.
    assert c.post(f"/api/certificados/{cert['id']}/autorizar", headers=h(2), json={'motivo': 'Autorización parroquial'}).status_code == 200
    assert c.post(f"/api/certificados/{cert['id']}/firmar", headers=h(2), json={}).status_code == 200
    assert c.get(f"/api/certificados/{cert['id']}/pdf", headers=h(3)).status_code == 200
    with factory() as db:
        obj = db.get(Certificado, cert['id'])
        assert obj.autorizado_por == 2 and obj.firmado_por == 2


def test_certificate_curia_approval_flow(api):
    c, h, factory, _ = api
    reg, _ = record(api)  # parroquia 1
    cert = c.post('/api/certificados/', headers=h(3), json={'registro_id': reg['id'], 'requiere_aprobacion_curia': True, 'motivo_curia': 'Trámite de competencia de la Curia'}).json()
    assert cert['estado'] == 'preparado' and cert['requiere_aprobacion_curia'] is True
    # Requiere autorización previa del párroco antes de la aprobación de Curia.
    assert c.post(f"/api/certificados/{cert['id']}/aprobar-curia", headers=h(8), json={}).status_code == 409
    assert c.post(f"/api/certificados/{cert['id']}/autorizar", headers=h(2), json={}).status_code == 200
    # El párroco no firma un trámite de competencia de la Curia.
    assert c.post(f"/api/certificados/{cert['id']}/firmar", headers=h(2), json={}).status_code == 403
    # El Canciller aprueba y firma.
    assert c.post(f"/api/certificados/{cert['id']}/aprobar-curia", headers=h(8), json={}).status_code == 200
    assert c.post(f"/api/certificados/{cert['id']}/firmar", headers=h(8), json={}).status_code == 200
    assert c.get(f"/api/certificados/{cert['id']}/pdf", headers=h(1)).status_code == 200
    with factory() as db:
        obj = db.get(Certificado, cert['id'])
        assert obj.aprobado_curia_por == 8 and obj.firmado_por == 8


def test_auditor_read_only_global_control(api):
    c, h, _, _ = api
    reg, _ = record(api)  # parroquia 1
    # Auditor consulta auditoría y reportes con alcance global.
    assert c.get('/api/auditoria/', headers=h(10)).status_code == 200
    assert c.get('/api/reportes', headers=h(10)).status_code == 200
    # Auditor no escribe, no emite, no aprueba ni firma.
    assert c.post('/api/personas/', headers=h(10), json={'nombres': 'Intento', 'apellidos': 'Auditor'}).status_code == 403
    assert c.post('/api/certificados/', headers=h(10), json={'registro_id': reg['id']}).status_code == 403
    assert c.post('/api/registros/', headers=h(10), json={}).status_code == 403


def test_secretario_general_diocesan_coordination(api):
    c, h, _, _ = api
    reg, _ = record(api, 6)  # parroquia 2
    # Secretario general ve solicitudes y auditoría de toda la diócesis.
    assert c.get('/api/auditoria/', headers=h(9)).status_code == 200
    # Secretario general prepara un certificado a nivel diocesano (custodia verificada).
    cert = c.post('/api/certificados/', headers=h(9), json={'registro_id': reg['id']}).json()
    assert cert['estado'] == 'preparado'
    # Pero no autoriza ni firma (son facultades del párroco/canciller).
    assert c.post(f"/api/certificados/{cert['id']}/autorizar", headers=h(9), json={}).status_code == 403
    assert c.post(f"/api/certificados/{cert['id']}/firmar", headers=h(9), json={}).status_code == 403


def test_parroco_assigns_only_parish_roles(api):
    c, h, _, _ = api
    # Párroco asigna secretario parroquial y consulta de su parroquia.
    assert c.post('/api/usuarios/', headers=h(2), json={'nombre': 'Secretario', 'email': 'sec-parr@example.org', 'password': PASSWORD, 'rol': 'secretario_parroquial'}).status_code == 201
    assert c.post('/api/usuarios/', headers=h(2), json={'nombre': 'Consulta', 'email': 'cons@example.org', 'password': PASSWORD, 'rol': 'consulta'}).status_code == 201
    # Párroco no asigna roles diocesanos ni eclesiásticos.
    for rol in ['canciller', 'auditor', 'secretario_general', 'administrador', 'parroco']:
        assert c.post('/api/usuarios/', headers=h(2), json={'nombre': 'Intento Rol', 'email': rol + '@example.org', 'password': PASSWORD, 'rol': rol}).status_code == 403
    # Administrador sí asigna los roles diocesanos.
    for rol in ['canciller', 'auditor', 'secretario_general']:
        assert c.post('/api/usuarios/', headers=h(1), json={'nombre': 'Diocesano', 'email': 'dioc-' + rol + '@example.org', 'password': PASSWORD, 'rol': rol}).status_code == 201


def test_diocesan_certificates_visible_and_downloadable(api):
    c, h, _, _ = api
    reg, _ = record(api, 6)
    cert = c.post('/api/certificados/', headers=h(9), json={'registro_id': reg['id']}).json()
    assert cert['parroquia_id'] == 2 and cert['emitido_por'] == 9
    for uid in [1, 8, 9]:
        assert any(row['id'] == cert['id'] for row in c.get('/api/certificados/', headers=h(uid)).json())
    assert c.get('/api/certificados/', headers=h(10)).json() == []
    assert c.post(f"/api/certificados/{cert['id']}/autorizar", headers=h(5), json={}).status_code == 200
    assert c.post(f"/api/certificados/{cert['id']}/firmar", headers=h(5), json={}).status_code == 200
    for uid in [1, 8, 9]:
        assert c.get(f"/api/certificados/{cert['id']}/pdf", headers=h(uid)).status_code == 200
    assert c.get(f"/api/certificados/{cert['id']}/pdf", headers=h(10)).status_code == 403


def test_invalid_certificate_transitions_and_annulment(api):
    c, h, factory, _ = api
    reg, _ = record(api)
    cert = c.post('/api/certificados/', headers=h(3), json={'registro_id': reg['id']}).json()
    path = f"/api/certificados/{cert['id']}"
    assert c.post(path + '/firmar', headers=h(2), json={}).status_code == 409
    assert c.post(path + '/autorizar', headers=h(5), json={}).status_code == 403
    assert c.post(path + '/anular', headers=h(1), json={}).status_code == 403
    assert c.post(path + '/aprobar-curia', headers=h(8), json={}).status_code == 403
    assert c.post(path + '/autorizar', headers=h(2), json={}).status_code == 200
    assert c.post(path + '/autorizar', headers=h(2), json={}).status_code == 409
    assert c.post(path + '/firmar', headers=h(2), json={}).status_code == 200
    assert c.post(path + '/firmar', headers=h(2), json={}).status_code == 409
    assert c.post(path + '/anular', headers=h(5), json={}).status_code == 403
    assert c.post(path + '/anular', headers=h(2), json={'motivo': 'Error documental comprobado'}).status_code == 200
    assert c.get('/api/certificados/verificar/' + cert['codigo_verificacion']).json() == {'valido': False, 'estado': 'anulado'}
    assert c.get(path + '/pdf', headers=h(3)).status_code == 409
    assert c.post(path + '/anular', headers=h(2), json={}).status_code == 409
    assert c.post(path + '/autorizar', headers=h(2), json={}).status_code == 409
    with factory() as db:
        assert db.query(Auditoria).filter_by(accion='ANULAR_CERTIFICADO', entidad_id=cert['id']).one().detalle == 'Error documental comprobado'


def test_interparish_curia_full_lifecycle(api):
    c, h, factory, _ = api
    reg, _ = record(api, 6)
    sid = c.post('/api/solicitudes/', headers=h(9), json={'registro_id': reg['id'], 'origen_id': 1, 'motivo': 'Coordinación diocesana de prueba'}).json()['id']
    assert c.post(f'/api/solicitudes/{sid}/decision', headers=h(9), json={'estado': 'aprobada', 'motivo': 'Intento sin facultad de custodia'}).status_code == 403
    assert c.post(f'/api/solicitudes/{sid}/decision', headers=h(6), json={'estado': 'aprobada', 'motivo': 'Solicitud y custodia verificadas'}).status_code == 200
    cert = c.post('/api/certificados/', headers=h(9), json={'registro_id': reg['id'], 'solicitud_id': sid, 'requiere_aprobacion_curia': True, 'motivo_curia': 'Trámite diocesano de prueba'}).json()
    path = f"/api/certificados/{cert['id']}"
    assert c.post(path + '/autorizar', headers=h(5), json={}).status_code == 200
    assert c.post(path + '/firmar', headers=h(8), json={}).status_code == 409
    assert c.post(path + '/aprobar-curia', headers=h(8), json={}).status_code == 200
    assert c.post(path + '/firmar', headers=h(8), json={}).status_code == 200
    assert c.get(path + '/pdf', headers=h(4)).status_code == 200
    assert c.get('/api/certificados/verificar/' + cert['codigo_verificacion']).json()['valido']
    with factory() as db:
        obj = db.get(Certificado, cert['id'])
        assert obj.autorizado_por == 5 and obj.aprobado_curia_por == obj.firmado_por == 8
        assert obj.fecha_autorizacion and obj.fecha_aprobacion_curia and obj.fecha_firma


def test_unassigned_custody_does_not_grant_auditor_legacy_records(api):
    from app.models import Persona, RegistroSacramental, Libro
    c, h, factory, _ = api
    with factory() as db:
        person = Persona(nombres='Histórico', apellidos='Sintético')
        db.add(person); db.flush()
        db.add(RegistroSacramental(persona_id=person.id, sacramento_id=1, datos={}))
        db.commit()
    assert c.get('/api/personas/', headers=h(10)).json() == []
    assert c.get('/api/registros/', headers=h(10)).json() == []
    assert len(c.get('/api/registros/', headers=h(1)).json()) == 1
    assert c.get('/api/reportes', headers=h(10)).json()['registros'] == 1


def test_concurrent_certificate_authorization(api):
    from concurrent.futures import ThreadPoolExecutor
    c, h, factory, _ = api
    reg, _ = record(api)
    cert = c.post('/api/certificados/', headers=h(3), json={'registro_id': reg['id']}).json()
    auth = h(2)
    def authorize(_):
        return c.post(f"/api/certificados/{cert['id']}/autorizar", headers=auth, json={}).status_code
    with ThreadPoolExecutor(max_workers=2) as executor:
        assert sorted(executor.map(authorize, range(2))) == [200, 409]
    with factory() as db:
        assert db.query(Auditoria).filter_by(accion='AUTORIZAR_CERTIFICADO', entidad_id=cert['id']).count() == 1


def test_correction_cannot_select_unconfigured_book(api):
    c, h, _, _ = api
    reg, payload = record(api)
    response = c.patch(f"/api/registros/{reg['id']}", headers=h(3), json={**payload, 'libro': 'No configurado', 'motivo': 'Corrección de prueba'} )
    assert response.status_code == 422
    assert c.get(f"/api/registros/{reg['id']}/historial", headers=h(3)).json() == []


def test_database_failure_is_sanitized(api):
    from app.main import app
    from app.database import get_db
    from sqlalchemy.exc import OperationalError
    c, h, _, _ = api
    credentials = h(3)
    original = app.dependency_overrides[get_db]
    def unavailable():
        raise OperationalError('SQL privado', {}, Exception('credencial privada de prueba'))
        yield
    app.dependency_overrides[get_db] = unavailable
    try:
        response = c.get('/api/registros/', headers=credentials)
        assert response.status_code == 503
        assert 'privad' not in response.text and 'SQL' not in response.text
    finally:
        app.dependency_overrides[get_db] = original
