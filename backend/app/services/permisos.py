"""Role policies are read on every authenticated request, never trusted from JWTs."""
from fastapi import Depends, HTTPException
from app.core.roles import ROLES
from app.models.administracion import PoliticaRol

PERMISOS = [
    ('canWrite', 'Registrar y corregir', 'Partidas, personas, libros y archivos.'),
    ('canManage', 'Gestionar usuarios', 'Cuentas de secretaría y consulta dentro del alcance del rol.'),
    ('canPrepareCert', 'Preparar certificados', 'Solicitar y preparar documentos para su autorización.'),
    ('canAudit', 'Consultar auditoría', 'Consultar la trazabilidad dentro del alcance del rol.'),
    ('canAuthorizeCert', 'Autorizar certificados', 'Facultad reservada al párroco custodio.'),
    ('canApproveCuria', 'Aprobar en Curia', 'Facultad reservada al canciller.'),
    ('canSignCert', 'Firmar y anular', 'Facultad reservada a párroco y canciller.'),
    ('globalRead', 'Lectura global', 'Alcance institucional fijo del cargo.'),
]


def predeterminados(rol):
    return {
        'canWrite': rol in {'administrador', 'parroco', 'secretario_parroquial'},
        'canManage': rol in {'administrador', 'parroco'},
        'canPrepareCert': rol in {'administrador', 'parroco', 'secretario_parroquial', 'secretario_general', 'canciller'},
        'canAudit': rol in {'administrador', 'parroco', 'auditor', 'canciller', 'secretario_general'},
        'canAuthorizeCert': rol == 'parroco',
        'canApproveCuria': rol == 'canciller',
        'canSignCert': rol in {'parroco', 'canciller'},
        'globalRead': rol in {'administrador', 'canciller', 'secretario_general'},
    }


def editables(rol):
    if rol == 'administrador':
        return []
    defaults = predeterminados(rol)
    return [key for key, _, _ in PERMISOS if key != 'globalRead' and
            (key not in {'canAuthorizeCert', 'canApproveCuria', 'canSignCert'} or defaults[key])]


def efectivos(db, rol):
    result = predeterminados(rol)
    policy = db.get(PoliticaRol, rol)
    if policy:
        result.update({key: value for key, value in policy.permisos.items() if key in editables(rol)})
    return result


def catalogo(db):
    from app.core.security import aware
    policies = {p.rol: p for p in db.query(PoliticaRol).all()}
    return [{'id': rol, 'permisos': {**predeterminados(rol), **(policies[rol].permisos if rol in policies else {})},
             'predeterminados': predeterminados(rol), 'editables': editables(rol),
             'revision': policies[rol].revision if rol in policies else 0,
             'actualizado': aware(policies[rol].actualizado) if rol in policies and policies[rol].actualizado else None} for rol in ROLES]


def requiere_permiso(key):
    from app.core.security import get_usuario_actual

    def verificar(user=Depends(get_usuario_actual)):
        if not user.permisos.get(key, False):
            raise HTTPException(403, 'Su rol no tiene habilitado este permiso')
        return user
    return verificar
