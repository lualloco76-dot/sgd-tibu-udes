import secrets
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.usuario import Usuario
from app.models.registro import RegistroSacramental as Registro
from app.models.institucional import Certificado, Solicitud, Parroquia
from app.schemas.institucional import CertificadoCreate, ActuacionRequest
from app.core.security import get_usuario_actual, utcnow
from app.core.deps import (
    requiere_preparacion_certificado, requiere_autorizacion_parroquial,
    requiere_aprobacion_curia, requiere_firma,
)
from app.core.roles import PARROCO, CANCILLER
from app.services.access import custodia, admin, approved, audit, lectura_global
from app.services.certificados import generar_pdf

router = APIRouter(prefix='/certificados', tags=['certificados'])

ESTADO_PREPARADO = 'preparado'
ESTADO_AUTORIZADO = 'autorizado'
ESTADO_APROBADO_CURIA = 'aprobado_curia'
ESTADO_FIRMADO = 'firmado'
ESTADO_ANULADO = 'anulado'


def public(cert):
    return {'referencia': {k: cert.instantanea.get(k) for k in ['libro', 'folio', 'numero']},
            'parroquia': cert.instantanea.get('parroquia'), **{k: getattr(cert, k) for k in [
        'id', 'numero', 'registro_id', 'solicitud_id', 'parroquia_id', 'codigo_verificacion',
        'fecha_emision', 'emitido_por', 'estado', 'requiere_aprobacion_curia', 'motivo_curia',
        'autorizado_por', 'fecha_autorizacion', 'aprobado_curia_por',
        'fecha_aprobacion_curia', 'firmado_por', 'fecha_firma',
    ]}}


def _snapshot(db, record, parish):
    snapshot = {
        'persona': record.persona.nombres + ' ' + record.persona.apellidos,
        'sacramento': record.sacramento.nombre,
        'parroquia': parish.nombre,
        'fecha_celebracion': str(record.fecha_celebracion),
        'libro': record.libro, 'folio': record.folio, 'numero': record.numero,
        'notas': record.notas, 'lugar': record.lugar, 'ministro': record.ministro,
        'datos': dict(record.datos),
    }
    spouse_id = record.datos.get('conyuge_persona_id')
    if spouse_id:
        from app.models.persona import Persona
        spouse = db.get(Persona, spouse_id)
        snapshot['datos']['conyuge'] = spouse.nombres + ' ' + spouse.apellidos if spouse else str(spouse_id)
        snapshot['datos'].pop('conyuge_persona_id', None)
    return snapshot


def _transition(db, obj, values):
    # PostgreSQL locks the row; the conditional update also protects SQLite.
    changed = db.query(Certificado).filter(
        Certificado.id == obj.id, Certificado.estado == obj.estado,
    ).update(values, synchronize_session=False)
    if changed != 1:
        raise HTTPException(409, 'El certificado cambió de estado; actualice el listado')


@router.get('/verificar/{codigo}')
def verificar(codigo: str, db: Session = Depends(get_db)):
    if len(codigo) > 100:
        raise HTTPException(404, 'Código no encontrado')
    obj = db.query(Certificado).filter(Certificado.codigo_verificacion == codigo).first()
    if not obj:
        raise HTTPException(404, 'Código no encontrado')
    if obj.estado == ESTADO_ANULADO:
        return {'valido': False, 'estado': ESTADO_ANULADO}
    if obj.estado != ESTADO_FIRMADO:
        return {'valido': False, 'estado': obj.estado}
    return {'valido': True, 'numero': obj.numero, 'fecha_emision': obj.fecha_emision, 'parroquia': obj.instantanea['parroquia']}


@router.post('/', status_code=201)
def preparar(data: CertificadoCreate, response: Response, db: Session = Depends(get_db), user: Usuario = Depends(requiere_preparacion_certificado)):
    """Genera técnicamente (prepara) un certificado; NO lo deja válido ni descargable."""
    record = db.get(Registro, data.registro_id)
    if not record:
        raise HTTPException(404, 'Registro no encontrado')
    custodia(user, record.parroquia_id)
    parish = db.get(Parroquia, record.parroquia_id)
    if not parish or not parish.activa:
        raise HTTPException(422, 'Custodia no asignada o inactiva')
    if any(value is None or value == '' for value in [record.fecha_celebracion, record.libro, record.folio, record.numero]):
        raise HTTPException(422, 'Complete fecha, libro, folio y número antes de emitir')
    if data.solicitud_id:
        request = db.query(Solicitud).filter(Solicitud.id == data.solicitud_id).with_for_update().first()
        if not request or request.registro_id != record.id or request.destino_id != record.parroquia_id or request.estado != 'aprobada':
            raise HTTPException(403, 'Solicitud no aprobada para este registro')
        existing = db.query(Certificado).filter(Certificado.solicitud_id == request.id,
            Certificado.estado != ESTADO_ANULADO).order_by(Certificado.id.desc()).first()
        if existing:
            if existing.requiere_aprobacion_curia != data.requiere_aprobacion_curia:
                raise HTTPException(409, 'La solicitud ya tiene un certificado en trámite. Continúe desde Certificados')
            response.status_code = 200
            return {**public(existing), 'reutilizado': True,
                    'mensaje': 'El certificado ya está preparado. Continúe su trámite en Certificados'}
    if data.requiere_aprobacion_curia and not data.motivo_curia:
        raise HTTPException(422, 'Indique el motivo de competencia de la Curia')
    snapshot = _snapshot(db, record, parish)
    obj = Certificado(
        numero='SGD-' + utcnow().strftime('%Y') + '-' + uuid4().hex[:20].upper(),
        registro_id=record.id, solicitud_id=data.solicitud_id, emitido_por=user.id,
        parroquia_id=record.parroquia_id, codigo_verificacion=secrets.token_urlsafe(32),
        instantanea=snapshot, estado=ESTADO_PREPARADO,
        requiere_aprobacion_curia=data.requiere_aprobacion_curia,
        motivo_curia=data.motivo_curia,
    )
    db.add(obj); db.flush()
    audit(db, user, 'PREPARAR_CERTIFICADO', 'certificados', obj.id, parroquia_id=record.parroquia_id)
    db.commit(); db.refresh(obj)
    return {**public(obj), 'reutilizado': False}


@router.post('/{id}/autorizar')
def autorizar(id: int, data: ActuacionRequest, db: Session = Depends(get_db), user: Usuario = Depends(requiere_autorizacion_parroquial)):
    """Autorización ordinaria del párroco custodio. No la ejerce el administrador."""
    obj = db.query(Certificado).filter(Certificado.id == id).with_for_update().first()
    if not obj:
        raise HTTPException(404, 'Certificado no encontrado')
    custodia(user, obj.parroquia_id)
    if obj.estado != ESTADO_PREPARADO:
        raise HTTPException(409, 'El certificado no está en estado preparado')
    _transition(db, obj, {'estado': ESTADO_AUTORIZADO, 'autorizado_por': user.id, 'fecha_autorizacion': utcnow()})
    audit(db, user, 'AUTORIZAR_CERTIFICADO', 'certificados', id, detalle=data.motivo or 'resultado=exitoso', parroquia_id=obj.parroquia_id)
    db.commit(); db.refresh(obj)
    return public(obj)


@router.post('/{id}/aprobar-curia')
def aprobar_curia(id: int, data: ActuacionRequest, db: Session = Depends(get_db), user: Usuario = Depends(requiere_aprobacion_curia)):
    """Aprobación del Canciller para trámites de competencia diocesana (Curia)."""
    obj = db.query(Certificado).filter(Certificado.id == id).with_for_update().first()
    if not obj:
        raise HTTPException(404, 'Certificado no encontrado')
    if not obj.requiere_aprobacion_curia:
        raise HTTPException(403, 'Este certificado no requiere aprobación de la Curia')
    if obj.estado != ESTADO_AUTORIZADO:
        raise HTTPException(409, 'Requiere autorización previa del párroco custodio')
    _transition(db, obj, {'estado': ESTADO_APROBADO_CURIA, 'aprobado_curia_por': user.id, 'fecha_aprobacion_curia': utcnow()})
    audit(db, user, 'APROBAR_CURIA_CERTIFICADO', 'certificados', id, detalle=data.motivo or 'resultado=exitoso', parroquia_id=obj.parroquia_id)
    db.commit(); db.refresh(obj)
    return public(obj)


@router.post('/{id}/firmar')
def firmar(id: int, data: ActuacionRequest, db: Session = Depends(get_db), user: Usuario = Depends(requiere_firma)):
    """Firma eclesiástica: párroco (parroquia) o Canciller (Curia)."""
    obj = db.query(Certificado).filter(Certificado.id == id).with_for_update().first()
    if not obj:
        raise HTTPException(404, 'Certificado no encontrado')
    if user.rol == CANCILLER:
        if not obj.requiere_aprobacion_curia or obj.estado != ESTADO_APROBADO_CURIA:
            raise HTTPException(409, 'El Canciller firma certificados aprobados por la Curia')
    else:  # párroco
        custodia(user, obj.parroquia_id)
        if obj.requiere_aprobacion_curia:
            raise HTTPException(403, 'Certificado de competencia de la Curia; requiere firma del Canciller')
        if obj.estado != ESTADO_AUTORIZADO:
            raise HTTPException(409, 'Requiere autorización previa del párroco custodio')
    _transition(db, obj, {'estado': ESTADO_FIRMADO, 'firmado_por': user.id, 'fecha_firma': utcnow()})
    audit(db, user, 'FIRMAR_CERTIFICADO', 'certificados', id, detalle=data.motivo or 'resultado=exitoso', parroquia_id=obj.parroquia_id)
    db.commit(); db.refresh(obj)
    return public(obj)


@router.post('/{id}/anular')
def anular(id: int, data: ActuacionRequest, db: Session = Depends(get_db), user: Usuario = Depends(requiere_firma)):
    """Anulación registrada; solo párroco custodio o Canciller."""
    obj = db.query(Certificado).filter(Certificado.id == id).with_for_update().first()
    if not obj:
        raise HTTPException(404, 'Certificado no encontrado')
    if user.rol == PARROCO:
        custodia(user, obj.parroquia_id)
    if obj.estado == ESTADO_ANULADO:
        raise HTTPException(409, 'El certificado ya está anulado')
    _transition(db, obj, {'estado': ESTADO_ANULADO})
    audit(db, user, 'ANULAR_CERTIFICADO', 'certificados', id, detalle=data.motivo or 'resultado=exitoso', parroquia_id=obj.parroquia_id)
    db.commit(); db.refresh(obj)
    return public(obj)


@router.get('/')
def listar(db: Session = Depends(get_db), user: Usuario = Depends(get_usuario_actual), skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200), certificado_id: int | None = Query(None, gt=0)):
    query = db.query(Certificado)
    if certificado_id is not None:
        query = query.filter(Certificado.id == certificado_id)
    if not lectura_global(user):
        if user.parroquia_id is None:
            return []
        query = query.outerjoin(Solicitud, Certificado.solicitud_id == Solicitud.id).filter(or_(
            Certificado.parroquia_id == user.parroquia_id,
            (Solicitud.origen_id == user.parroquia_id) & (Solicitud.estado == 'aprobada'),
        ))
    return [public(c) for c in query.order_by(Certificado.id.desc()).offset(skip).limit(limit).all()]


@router.get('/{id}/pdf')
def pdf(id: int, db: Session = Depends(get_db), user: Usuario = Depends(get_usuario_actual)):
    obj = db.get(Certificado, id)
    if not obj:
        raise HTTPException(404, 'Certificado no encontrado')
    if obj.estado != ESTADO_FIRMADO:
        raise HTTPException(409, 'El certificado no está firmado y no puede entregarse')
    if not lectura_global(user) and obj.parroquia_id != user.parroquia_id:
        if not obj.solicitud_id or not approved(db, user, obj.registro_id, obj.solicitud_id):
            raise HTTPException(403, 'Descarga no autorizada')
    content = generar_pdf(obj)
    audit(db, user, 'DESCARGAR_CERTIFICADO', 'certificados', id)
    db.commit()
    return Response(content, media_type='application/pdf', headers={'Content-Disposition': f'attachment; filename="{obj.numero}.pdf"', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'})


@router.get('/{id}/trazabilidad')
def trazabilidad(id: int, db: Session = Depends(get_db), user: Usuario = Depends(get_usuario_actual)):
    obj = db.get(Certificado, id)
    if not obj:
        raise HTTPException(404, 'Certificado no encontrado')
    own = lectura_global(user) or (user.parroquia_id is not None and obj.parroquia_id == user.parroquia_id)
    if not own and (not obj.solicitud_id or not approved(db, user, obj.registro_id, obj.solicitud_id)):
        raise HTTPException(403, 'No tiene autorización para consultar este certificado')
    from app.services.presentacion import eventos_certificado, parish, responsable
    from app.core.security import aware
    # The requesting parish receives personal contents only after signature.
    release = own or obj.estado == ESTADO_FIRMADO
    request = db.get(Solicitud, obj.solicitud_id) if obj.solicitud_id else None
    relation = {'origen': parish(db, request.origen_id), 'destino': parish(db, request.destino_id),
                'estado': request.estado, 'fecha': aware(request.fecha_creacion) if request.fecha_creacion else None,
                'fecha_decision': aware(request.fecha_decision) if request.fecha_decision else None,
                'responsable': responsable(db, request.responsable_id), 'motivo_decision': request.decision_motivo} if request else None
    return {**public(obj), 'persona': obj.instantanea.get('persona') if release else None,
            'tipo_partida': obj.instantanea.get('sacramento') if release else None,
            'parroquia': obj.instantanea.get('parroquia') or parish(db, obj.parroquia_id),
            'referencia': {k: obj.instantanea.get(k) for k in ['libro', 'folio', 'numero']},
            'contenido_disponible': release, 'eventos': eventos_certificado(db, obj), 'solicitud': relation}
