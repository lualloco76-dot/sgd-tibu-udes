from fastapi import HTTPException
from app.models.auditoria import Auditoria
from app.models.institucional import Parroquia, Solicitud
from app.core.roles import (
    es_admin, es_lectura_global, ROLES_AUDITORIA_GLOBAL,
)


def admin(user):
    """Administrador técnico global."""
    return es_admin(user)


def lectura_global(user):
    """Alcance de lectura global para función de supervisión o coordinación."""
    return es_lectura_global(user)


def custodia(user, parroquia_id):
    """Guarda de custodia para recursos parroquiales.

    El administrador y los roles de supervisión/coordinación diocesana leen de
    forma global. El resto (párroco, secretario parroquial, consulta) accede solo
    a su propia parroquia. Los roles diocesanos sin parroquia no pueden ejercer
    escritura parroquial por esta vía.
    """
    if admin(user) or lectura_global(user):
        return
    if not parroquia_id or user.parroquia_id != parroquia_id:
        raise HTTPException(403, 'Recurso fuera de su parroquia custodiante')


def parroquia_destino(db, user, requested=None):
    target = requested if requested is not None else user.parroquia_id
    custodia_escritura(user, target)
    parish = db.get(Parroquia, target) if target else None
    if not parish or not parish.activa:
        raise HTTPException(422, 'Seleccione una parroquia activa')
    return target


def custodia_escritura(user, parroquia_id):
    """Read-wide diocesan access never grants parish write custody."""
    if admin(user):
        return
    if parroquia_id is None or user.parroquia_id != parroquia_id:
        raise HTTPException(403, 'Recurso fuera de su parroquia custodiante')


def scope(query, model, user, global_read=None):
    """Filtro de alcance de lectura.

    `global_read` puede forzarse para recursos que determinados roles consultan
    sin filtro parroquial (p. ej. auditoría y reportes para el auditor).
    """
    if global_read is None:
        global_read = admin(user) or lectura_global(user)
    if global_read:
        return query
    if user.parroquia_id is None:
        # Sin custodia asignada no se concede acceso a datos históricos sin asignar.
        return query.filter(False)
    return query.filter(model.parroquia_id == user.parroquia_id)


def scope_auditoria(user):
    """Alcance global de auditoría/reportes para roles de control."""
    return admin(user) or user.rol in ROLES_AUDITORIA_GLOBAL


def audit(db, user, accion, entidad, entidad_id=None, detalle='resultado=exitoso', parroquia_id=None):
    db.add(Auditoria(usuario_id=user.id if user else None, accion=accion, entidad=entidad, entidad_id=entidad_id, detalle=detalle, parroquia_id=parroquia_id if parroquia_id is not None else (user.parroquia_id if user else None)))


def approved(db, user, record_id, solicitud_id=None):
    query = db.query(Solicitud).filter(Solicitud.registro_id == record_id, Solicitud.origen_id == user.parroquia_id, Solicitud.estado == 'aprobada')
    if solicitud_id is not None:
        query = query.filter(Solicitud.id == solicitud_id)
    return query.first()
