"""Live dashboard aggregates. Identifiable recent rows keep ordinary read scope."""
from datetime import date
from sqlalchemy import extract, func, or_
from sqlalchemy.orm import joinedload
from app.models import Auditoria, Certificado, Documento, Libro, Parroquia, Persona, RegistroSacramental as Registro, Sacramento, Solicitud, Usuario
from app.core.security import utcnow
from app.core.dates import today as colombia_today
from app.core.roles import ROLES_AUDITORIA_GLOBAL, PARROCO
from app.services.access import admin, lectura_global, scope, scope_auditoria


def build_panel(db, user):
    global_stats = scope_auditoria(user)
    records = scope(db.query(Registro), Registro, user, global_read=global_stats)
    certificates = scope(db.query(Certificado), Certificado, user, global_read=global_stats)
    requests = db.query(Solicitud)
    if not admin(user) and not lectura_global(user):
        requests = requests.filter(or_(Solicitud.origen_id == user.parroquia_id, Solicitud.destino_id == user.parroquia_id))
    counts = records.join(Sacramento).with_entities(Sacramento.nombre, func.count(Registro.id)).group_by(Sacramento.nombre).all()
    today = colombia_today()
    month_indices = [today.year * 12 + today.month - 1 - offset for offset in reversed(range(6))]
    months = [date(index // 12, index % 12 + 1, 1) for index in month_indices]
    year, month = extract('year', Registro.fecha_celebracion), extract('month', Registro.fecha_celebracion)
    timeline = records.filter(Registro.fecha_celebracion >= months[0], Registro.fecha_celebracion <= today).with_entities(year, month, func.count(Registro.id)).group_by(year, month).all()
    by_month = {(int(y), int(m)): total for y, m, total in timeline}
    parishes = {item.id: item for item in db.query(Parroquia).all()}
    recent = scope(db.query(Registro), Registro, user).options(joinedload(Registro.persona), joinedload(Registro.sacramento)).order_by(Registro.id.desc()).limit(5).all()
    events = []
    if user.permisos.get('canAudit', False):
        events = scope(db.query(Auditoria), Auditoria, user, global_read=global_stats).order_by(Auditoria.id.desc()).limit(5).all()
    own_parish = parishes.get(user.parroquia_id)
    return {
        'registros': records.count(),
        'solicitudes_pendientes': requests.filter(Solicitud.estado == 'pendiente').count(),
        'certificados': certificates.count(),
        'por_sacramento': dict(counts),
        'personas': scope(db.query(Persona), Persona, user, global_read=global_stats).count(),
        'libros': scope(db.query(Libro), Libro, user, global_read=global_stats).count(),
        'documentos': scope(db.query(Documento).join(Registro, Documento.registro_id == Registro.id), Registro, user, global_read=global_stats).count(),
        'parroquias_activas': sum(item.activa for item in parishes.values()),
        'usuarios_activos': db.query(Usuario).filter(Usuario.activo.is_(True)).count() if admin(user) else None,
        'certificados_por_estado': dict(certificates.with_entities(Certificado.estado, func.count(Certificado.id)).group_by(Certificado.estado).all()),
        'solicitudes_por_estado': dict(requests.with_entities(Solicitud.estado, func.count(Solicitud.id)).group_by(Solicitud.estado).all()),
        'actividad_mensual': [{'mes': value.strftime('%Y-%m'), 'total': by_month.get((value.year, value.month), 0)} for value in months],
        'ultimas_partidas': [{'id': item.id, 'persona': f'{item.persona.nombres} {item.persona.apellidos}', 'tipo': item.sacramento.nombre, 'fecha': item.fecha_celebracion, 'parroquia': parishes[item.parroquia_id].nombre if item.parroquia_id in parishes else 'Sin custodia'} for item in recent],
        'actividad_reciente': [{'id': event.id, 'accion': event.accion, 'entidad': event.entidad, 'fecha': event.fecha} for event in events],
        'ambito': 'Diocesano' if global_stats or admin(user) or lectura_global(user) else (own_parish.nombre if own_parish else 'Sin parroquia asignada'),
        'actualizado': utcnow(),
    }
