"""Dependencias de autorización por capacidades persistentes de cada rol.

Las políticas se consultan en cada petición; `administrador` siempre conserva
acceso técnico global. Las reglas de custodia (parroquia) se
aplican adicionalmente en los endpoints mediante `services.access`.
"""
from app.core.security import requiere_rol, requiere_rol_estricto
from app.services.permisos import requiere_permiso
from app.core.roles import (
    ADMINISTRADOR, PARROCO, SECRETARIO_PARROQUIAL, SECRETARIO_GENERAL,
    CANCILLER, AUDITOR,
)

# Administración técnica global.
requiere_admin = requiere_rol(ADMINISTRADOR)

# Gestión de usuarios: administrador (global) o párroco (su parroquia).
requiere_gestion_usuarios = requiere_permiso('canManage')

# Escritura parroquial (registrar/corregir partidas, personas, libros, documentos).
requiere_escritura = requiere_permiso('canWrite')

# Revisión de auditoría: administrador, auditor, canciller, secretario general y párroco.
requiere_auditoria = requiere_permiso('canAudit')

# Preparación técnica de certificados (generar PDF/instantánea).
requiere_preparacion_certificado = requiere_permiso('canPrepareCert')

# Aprobación de trámites de competencia de la Curia.
requiere_aprobacion_curia = requiere_permiso('canApproveCuria')

# Firma eclesiástica: párroco (parroquia) o canciller (Curia).
requiere_firma = requiere_permiso('canSignCert')

# Autorización ordinaria del párroco custodio (sin bypass de administrador).
requiere_autorizacion_parroquial = requiere_permiso('canAuthorizeCert')
