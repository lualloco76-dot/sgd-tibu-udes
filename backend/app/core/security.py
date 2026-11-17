from datetime import datetime, timedelta, timezone
import secrets
import bcrypt
import jwt
from jwt.exceptions import InvalidTokenError as JWTError
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.usuario import Usuario
from app.models.institucional import Sesion, Parroquia
from app.core.roles import es_admin, es_diocesano
from app.config import settings
bearer = HTTPBearer(auto_error=False)
def utcnow():
    return datetime.now(timezone.utc)
def aware(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
def verificar_password(password_plano, password_hash):
    try:
        return bcrypt.checkpw(password_plano.encode(), password_hash.encode())
    except (ValueError, TypeError):
        return False
def hash_password(password):
    if not 8 <= len(password) or len(password.encode()) > 72:
        raise HTTPException(422, 'La contraseña debe tener al menos 8 caracteres y máximo 72 bytes')
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
def crear_token_acceso(data, expires_delta=None):
    if len(settings.SECRET_KEY) < 32:
        raise HTTPException(503, 'Configure SECRET_KEY con al menos 32 caracteres')
    return jwt.encode({**data, 'exp': utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
def nueva_sesion(db, usuario):
    sid = secrets.token_urlsafe(32)
    expires = utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = crear_token_acceso({'sub': str(usuario.id), 'jti': sid, 'ver': usuario.token_version})
    db.add(Sesion(id=sid, usuario_id=usuario.id, expira=expires))
    return token
def get_usuario_actual(request: Request, credentials: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)):
    error = HTTPException(401, 'Sesión inválida o expirada', headers={'WWW-Authenticate': 'Bearer'})
    if not credentials or len(settings.SECRET_KEY) < 32:
        raise error
    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={'require': ['exp', 'sub', 'jti']})
        usuario = db.get(Usuario, int(payload['sub']))
        sesion = db.get(Sesion, payload['jti'])
        if not usuario or not usuario.activo or not sesion or sesion.revocada or sesion.usuario_id != usuario.id or aware(sesion.expira) <= utcnow() or payload.get('ver') != usuario.token_version:
            raise error
        if not es_admin(usuario) and not es_diocesano(usuario):
            parish = db.get(Parroquia, usuario.parroquia_id) if usuario.parroquia_id else None
            if not parish or not parish.activa:
                raise error
        usuario._sesion_id = sesion.id
        if usuario.debe_cambiar_password and request.url.path not in {'/api/auth/me', '/api/auth/change-password', '/api/auth/logout'}:
            raise HTTPException(403, 'Debe cambiar la contraseña temporal antes de continuar')
        from app.services.permisos import efectivos
        usuario.permisos = efectivos(db, usuario.rol)
        return usuario
    except (JWTError, ValueError, KeyError, TypeError):
        raise error
def requiere_rol(*roles):
    def verificar(usuario: Usuario = Depends(get_usuario_actual)):
        if usuario.rol not in roles and usuario.rol != 'administrador':
            raise HTTPException(403, 'Operación no autorizada para este rol')
        return usuario
    return verificar


def requiere_rol_estricto(*roles):
    """Autorización sin bypass de administrador.

    Se usa en actuaciones eclesiásticas (autorizar, aprobar Curia, firmar) que el
    administrador técnico no adquiere automáticamente.
    """
    def verificar(usuario: Usuario = Depends(get_usuario_actual)):
        if usuario.rol not in roles:
            raise HTTPException(403, 'Operación no autorizada para este rol')
        return usuario
    return verificar
