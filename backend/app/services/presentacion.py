"""Explicit, privacy-aware presentation of persisted documentary evidence."""
from app.models import Usuario, Persona, Parroquia, Sacramento, Auditoria
from app.core.security import aware
from app.services.access import lectura_global

FIELD_LABELS = {
    'persona_id': 'Persona titular', 'sacramento_id': 'Tipo de partida',
    'parroquia_id': 'Parroquia custodiante', 'fecha_celebracion': 'Fecha de celebración',
    'lugar': 'Lugar de celebración', 'ministro': 'Ministro responsable', 'libro': 'Libro',
    'folio': 'Folio', 'numero': 'Número de partida', 'notas': 'Notas marginales',
    'padre': 'Nombre del padre', 'madre': 'Nombre de la madre', 'padrino': 'Padrino',
    'madrina': 'Madrina', 'referencia_bautismo': 'Referencia del bautismo',
    'conyuge_persona_id': 'Otra persona contrayente', 'testigo_1': 'Primer testigo',
    'testigo_2': 'Segundo testigo', 'fecha_defuncion': 'Fecha de defunción',
    'causa': 'Causa consignada', 'lugar_sepultura': 'Lugar de sepultura',
}
ACTIONS = {
    'PREPARAR_CERTIFICADO': ('Preparación del certificado', 'preparado'),
    'AUTORIZAR_CERTIFICADO': ('Autorización del párroco', 'autorizado'),
    'APROBAR_CURIA_CERTIFICADO': ('Aprobación de Curia', 'aprobado_curia'),
    'FIRMAR_CERTIFICADO': ('Firma administrativa registrada', 'firmado'),
    'ANULAR_CERTIFICADO': ('Anulación del certificado', 'anulado'),
    'DESCARGAR_CERTIFICADO': ('Entrega del certificado', None),
}


def responsable(db, uid):
    obj = db.get(Usuario, uid) if uid else None
    return {'nombre': obj.nombre, 'rol': obj.rol} if obj else None


def parish(db, pid):
    obj = db.get(Parroquia, pid) if pid else None
    return obj.nombre if obj else None


def value(db, key, val, user):
    if val is None or val == '':
        return None
    if key in {'persona_id', 'conyuge_persona_id'}:
        obj = db.get(Persona, val) if isinstance(val, int) else None
        if obj and (lectura_global(user) or obj.parroquia_id == user.parroquia_id):
            return obj.nombres + ' ' + obj.apellidos
        return 'Información no disponible'
    if key == 'parroquia_id':
        return parish(db, val)
    if key == 'sacramento_id':
        obj = db.get(Sacramento, val)
        return obj.nombre if obj else None
    return val if isinstance(val, (str, int, bool)) else None


def cambios(db, before, after, user, reveal=True):
    result = []
    for key, label in FIELD_LABELS.items():
        for old, new in [(before, after), (before.get('datos') or {}, after.get('datos') or {})]:
            if key not in old and key not in new:
                continue
            if old.get(key) != new.get(key):
                result.append({'campo': label, 'tipo': 'fecha' if key.startswith('fecha_') else 'texto',
                               'anterior': value(db, key, old.get(key), user) if reveal else None,
                               'nuevo': value(db, key, new.get(key), user) if reveal else None})
    return result


def eventos_certificado(db, cert):
    events = db.query(Auditoria).filter(Auditoria.entidad == 'certificados',
        Auditoria.entidad_id == cert.id).order_by(Auditoria.fecha, Auditoria.id).all()
    result = []
    for event in events:
        if event.accion not in ACTIONS:
            continue
        label, status = ACTIONS[event.accion]
        result.append({'id': event.id, 'accion': label, 'fecha': aware(event.fecha) if event.fecha else None,
                       'responsable': responsable(db, event.usuario_id), 'estado': status,
                       'motivo': None if event.detalle == 'resultado=exitoso' else event.detalle})
    # A missing audit event can only be replaced by an explicitly persisted date.
    for action, date_key, actor_key in [
        ('PREPARAR_CERTIFICADO', 'fecha_emision', 'emitido_por'),
        ('AUTORIZAR_CERTIFICADO', 'fecha_autorizacion', 'autorizado_por'),
        ('APROBAR_CURIA_CERTIFICADO', 'fecha_aprobacion_curia', 'aprobado_curia_por'),
        ('FIRMAR_CERTIFICADO', 'fecha_firma', 'firmado_por'),
    ]:
        label, status = ACTIONS[action]
        date = getattr(cert, date_key)
        if date and not any(e['accion'] == label for e in result):
            result.append({'id': date_key, 'accion': label, 'estado': status, 'fecha': aware(date),
                           'responsable': responsable(db, getattr(cert, actor_key)), 'motivo': None})
    return sorted(result, key=lambda e: (e['fecha'] is None, e['fecha'].isoformat() if e['fecha'] else ''))
