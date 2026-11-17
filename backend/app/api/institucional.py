from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Literal
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.usuario import Usuario
from app.models.sacramento import Sacramento
from app.models.registro import RegistroSacramental as Registro
from app.models.institucional import Parroquia, Libro, Solicitud, Certificado
from app.schemas.institucional import ParroquiaCreate, ParroquiaUpdate, LibroCreate, SolicitudCreate, Decision
from app.core.security import get_usuario_actual, utcnow
from app.core.deps import requiere_admin, requiere_escritura, requiere_preparacion_certificado
from app.services.access import admin, custodia, custodia_escritura, parroquia_destino, scope, scope_auditoria, audit, lectura_global

router = APIRouter(tags=['institucional'])


@router.get('/parroquias/')
def parroquias(db: Session = Depends(get_db), user: Usuario = Depends(get_usuario_actual), skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200), q: str = Query('', max_length=200), activa: bool | None = None):
    query = db.query(Parroquia)
    if q:
        query = query.filter(or_(Parroquia.nombre.ilike('%'+q+'%'), Parroquia.codigo.ilike('%'+q+'%'), Parroquia.municipio.ilike('%'+q+'%'), Parroquia.localidad.ilike('%'+q+'%')))
    if activa is not None:
        query = query.filter(Parroquia.activa.is_(activa))
    return query.order_by(Parroquia.nombre, Parroquia.id).offset(skip).limit(limit).all()


@router.post('/parroquias/', status_code=201)
def crear_parroquia(data: ParroquiaCreate, db: Session = Depends(get_db), user: Usuario = Depends(requiere_admin)):
    obj = Parroquia(**data.model_dump()); db.add(obj); db.flush()
    audit(db, user, 'CREAR', 'parroquias', obj.id, parroquia_id=obj.id); db.commit(); return obj


@router.patch('/parroquias/{id}')
def editar_parroquia(id: int, data: ParroquiaUpdate, db: Session = Depends(get_db), user: Usuario = Depends(requiere_admin)):
    obj = db.get(Parroquia, id)
    if not obj: raise HTTPException(404, 'Parroquia no encontrada')
    for k, v in data.model_dump(exclude_unset=True).items():
        if v is None and k in {'nombre', 'activa', 'tipo'}: raise HTTPException(422, 'No se admiten valores nulos en campos obligatorios')
        setattr(obj, k, v)
    audit(db, user, 'MODIFICAR', 'parroquias', id, parroquia_id=id); db.commit(); return obj


@router.get('/libros/')
def libros(db: Session = Depends(get_db), user: Usuario = Depends(get_usuario_actual), skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200)):
    return scope(db.query(Libro), Libro, user).order_by(Libro.id).offset(skip).limit(limit).all()


@router.post('/libros/', status_code=201)
def crear_libro(data: LibroCreate, db: Session = Depends(get_db), user: Usuario = Depends(requiere_escritura)):
    target = parroquia_destino(db, user, data.parroquia_id)
    if not db.get(Sacramento, data.sacramento_id): raise HTTPException(422, 'Tipo de registro inexistente')
    obj = Libro(parroquia_id=target, sacramento_id=data.sacramento_id, numero=data.numero); db.add(obj); db.flush()
    audit(db, user, 'CREAR', 'libros', obj.id, parroquia_id=target); db.commit(); return obj


@router.post('/solicitudes/', status_code=201)
def solicitar(data: SolicitudCreate, db: Session = Depends(get_db), user: Usuario = Depends(requiere_preparacion_certificado)):
    proxy = type('Custodian', (), {'rol': 'administrador', 'parroquia_id': None})()
    if admin(user) or lectura_global(user):
        origin = parroquia_destino(db, proxy, data.origen_id)
    else:
        origin = parroquia_destino(db, user)
    record = db.get(Registro, data.registro_id)
    if not record or not record.parroquia_id: raise HTTPException(404, 'Referencia documental no disponible')
    if record.parroquia_id == origin: raise HTTPException(422, 'La solicitud requiere otra parroquia custodiante')
    obj = Solicitud(registro_id=record.id, origen_id=origin, destino_id=record.parroquia_id, solicitante_id=user.id, motivo=data.motivo)
    db.add(obj); db.flush()
    audit(db, user, 'SOLICITAR', 'solicitudes', obj.id)
    db.commit(); return obj


@router.get('/solicitudes/')
def solicitudes(db: Session = Depends(get_db), user: Usuario = Depends(get_usuario_actual), skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200), registro_id: int | None = Query(None, gt=0), estado: Literal['pendiente', 'aprobada', 'rechazada'] | None = None):
    query = db.query(Solicitud)
    if registro_id is not None:
        query = query.filter(Solicitud.registro_id == registro_id)
    if estado is not None:
        query = query.filter(Solicitud.estado == estado)
    if not admin(user) and not lectura_global(user):
        query = query.filter(or_(Solicitud.origen_id == user.parroquia_id, Solicitud.destino_id == user.parroquia_id))
    return [solicitud_publica(db, obj) for obj in query.order_by(Solicitud.id.desc()).offset(skip).limit(limit).all()]


def solicitud_publica(db, obj):
    from app.services.presentacion import parish, responsable
    from app.core.security import aware
    cert = db.query(Certificado).filter(Certificado.solicitud_id == obj.id, Certificado.estado != 'anulado').order_by(Certificado.id.desc()).first()
    record = db.get(Registro, obj.registro_id)
    result = {c.name: getattr(obj, c.name) for c in Solicitud.__table__.columns}
    for key in ['fecha_creacion', 'fecha_decision']:
        result[key] = aware(result[key]) if result[key] else None
    return {**result, 'referencia': {k: getattr(record, k) for k in ['libro', 'folio', 'numero']} if record else None,
            'parroquia_origen': parish(db, obj.origen_id), 'parroquia_destino': parish(db, obj.destino_id),
            'solicitante': responsable(db, obj.solicitante_id), 'responsable': responsable(db, obj.responsable_id),
            'certificado': {'id': cert.id, 'numero': cert.numero, 'estado': cert.estado} if cert else None}


@router.get('/solicitudes/{id}')
def detalle_solicitud(id: int, db: Session = Depends(get_db), user: Usuario = Depends(get_usuario_actual)):
    obj = db.get(Solicitud, id)
    if not obj:
        raise HTTPException(404, 'Solicitud no encontrada')
    if not lectura_global(user) and (user.parroquia_id is None or user.parroquia_id not in {obj.origen_id, obj.destino_id}):
        raise HTTPException(403, 'Solicitud fuera de su parroquia')
    record = db.get(Registro, obj.registro_id)
    return {**solicitud_publica(db, obj), 'referencia': {k: getattr(record, k) for k in ['libro', 'folio', 'numero']} if record else None}


@router.post('/solicitudes/{id}/decision')
def decidir(id: int, data: Decision, db: Session = Depends(get_db), user: Usuario = Depends(requiere_escritura)):
    obj = db.query(Solicitud).filter(Solicitud.id == id).with_for_update().first()
    if not obj: raise HTTPException(404, 'Solicitud no encontrada')
    custodia_escritura(user, obj.destino_id)
    if obj.estado != 'pendiente': raise HTTPException(409, 'La solicitud ya tiene una decisión definitiva')
    changed = db.query(Solicitud).filter(Solicitud.id == id, Solicitud.estado == 'pendiente').update({'estado': data.estado, 'decision_motivo': data.motivo, 'responsable_id': user.id, 'fecha_decision': utcnow()}, synchronize_session=False)
    if changed != 1: raise HTTPException(409, 'La solicitud ya fue decidida')
    audit(db, user, 'APROBAR' if data.estado == 'aprobada' else 'RECHAZAR', 'solicitudes', id, parroquia_id=obj.destino_id)
    db.commit(); db.refresh(obj); return obj


@router.get('/reportes')
def reportes(db: Session = Depends(get_db), user: Usuario = Depends(get_usuario_actual)):
    from app.services.panel import build_panel
    return build_panel(db, user)
