"""Control de acceso basado en roles (RBAC) del SGD Diócesis de Tibú.

Conjuntos y predicados de rol/ámbito compartidos por dependencias FastAPI y
servicios. No se concede ningún privilegio automáticamente: cada endpoint decide
explícitamente qué roles puede ejercer cada operación y aplica el filtro de
custodia (parroquia) correspondiente.

La facultad de aprobar o firmar documentos eclesiásticos permanece separada de
la administración técnica. Los trámites de competencia de la Curia se marcan con
`requiere_aprobacion_curia`; los casos no definidos se documentan como pendientes
de validación por la Diócesis.
"""
from app.models.usuario import RolUsuario

ADMINISTRADOR = RolUsuario.ADMINISTRADOR.value
PARROCO = RolUsuario.PARROCO.value
SECRETARIO_PARROQUIAL = RolUsuario.SECRETARIO_PARROQUIAL.value
SECRETARIO_GENERAL = RolUsuario.SECRETARIO_GENERAL.value
CANCILLER = RolUsuario.CANCILLER.value
AUDITOR = RolUsuario.AUDITOR.value
CONSULTA = RolUsuario.CONSULTA.value

ROLES = [r.value for r in RolUsuario]

# Roles con función institucional diocesana (sin parroquia propia).
ROLES_DIOCESANOS = {SECRETARIO_GENERAL, CANCILLER, AUDITOR}

# Roles con escritura sobre partidas dentro de su propia parroquia.
ROLES_ESCRITURA_PARROQUIAL = {PARROCO, SECRETARIO_PARROQUIAL}

# Roles que pueden gestionar cuentas de su parroquia (asignación de roles limitada).
ROLES_GESTION_PARROQUIAL = {PARROCO}

# Roles que pueden revisar auditoría con alcance global.
ROLES_AUDITORIA_GLOBAL = {ADMINISTRADOR, AUDITOR, CANCILLER, SECRETARIO_GENERAL}

# Roles que pueden leer con alcance global (función de supervisión o coordinación).
ROLES_LECTURA_GLOBAL = {ADMINISTRADOR, CANCILLER, SECRETARIO_GENERAL}

# Roles que pueden emitir técnicamente (preparar) un certificado.
ROLES_PREPARA_CERTIFICADO = {PARROCO, SECRETARIO_PARROQUIAL, SECRETARIO_GENERAL, CANCILLER, ADMINISTRADOR}

# Roles con autorización eclesiástica para firmar/validar documentos.
ROLES_FIRMA = {PARROCO, CANCILLER}


def es_admin(user):
    return user.rol == ADMINISTRADOR


def es_diocesano(user):
    """Rol de función diocesana sin parroquia propia."""
    return user.rol in ROLES_DIOCESANOS


def es_lectura_global(user):
    return user.rol in ROLES_LECTURA_GLOBAL


def es_parroquial(user):
    return user.rol in ROLES_ESCRITURA_PARROQUIAL or user.rol == CONSULTA


def puede_firmar(user):
    return user.rol in ROLES_FIRMA


def puede_aprobar_curia(user):
    return user.rol == CANCILLER
