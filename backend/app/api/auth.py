from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.usuario import Usuario
from app.models.institucional import Sesion, Parroquia
from app.schemas.token import Token, LoginRequest, LoginParroquia
from app.schemas.usuario import UsuarioOut
from app.schemas.institucional import PasswordChange
from app.core.security import verificar_password, hash_password, nueva_sesion, get_usuario_actual, utcnow, aware
from app.core.roles import es_admin, es_diocesano
from app.services.access import audit

# Equalize the expensive hash check for unknown accounts without persisting a dummy user.
_DUMMY_HASH = hash_password('synthetic-timing-only-password')
router = APIRouter(prefix='/auth', tags=['auth'])

@router.get('/parroquias', response_model=list[LoginParroquia])
def parroquias_login(db: Session = Depends(get_db)):
    """Public login catalog: active parish names and codes, without account data."""
    return db.query(Parroquia).filter(Parroquia.activa.is_(True)).order_by(Parroquia.nombre, Parroquia.id).all()

@router.post('/login', response_model=Token)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(func.lower(Usuario.email) == data.email.strip().lower()).with_for_update().first()
    if user and user.bloqueado_hasta and aware(user.bloqueado_hasta) > utcnow():
        raise HTTPException(429, 'Demasiados intentos. Espere 15 minutos')
    parish = db.get(Parroquia, user.parroquia_id) if user and user.parroquia_id else None
    password_ok = verificar_password(data.password, user.password_hash if user else _DUMMY_HASH)
    diocesan = user and (es_admin(user) or es_diocesano(user))
    context_ok = (data.parroquia_id is None) if diocesan else bool(
        parish and parish.activa and data.parroquia_id == user.parroquia_id
    )
    if not user or not password_ok or not user.activo or not context_ok:
        if user:
            user.intentos_fallidos += 1
            if user.intentos_fallidos >= 5: user.bloqueado_hasta = utcnow() + timedelta(minutes=15)
        audit(db, user, 'LOGIN_FALLIDO', 'sesiones', detalle='resultado=denegado')
        db.commit()
        raise HTTPException(401, 'Credenciales, parroquia o tipo de acceso incorrectos, o cuenta no habilitada')
    token = nueva_sesion(db, user)
    user.intentos_fallidos = 0
    user.bloqueado_hasta = None
    audit(db, user, 'INICIO_SESION', 'sesiones')
    db.commit()
    return {'access_token': token, 'token_type': 'bearer'}
@router.get('/me', response_model=UsuarioOut)
def me(user: Usuario = Depends(get_usuario_actual)):
    return user
@router.post('/logout')
def logout(db: Session = Depends(get_db), user: Usuario = Depends(get_usuario_actual)):
    db.get(Sesion, user._sesion_id).revocada = True
    audit(db, user, 'CIERRE_SESION', 'sesiones')
    db.commit()
    return {'mensaje': 'Sesión cerrada'}
@router.post('/change-password')
def change(data: PasswordChange, db: Session = Depends(get_db), user: Usuario = Depends(get_usuario_actual)):
    if not verificar_password(data.actual, user.password_hash): raise HTTPException(400, 'Contraseña actual incorrecta')
    if data.actual == data.nueva: raise HTTPException(422, 'La nueva contraseña debe ser diferente de la temporal o actual')
    user.password_hash = hash_password(data.nueva)
    user.debe_cambiar_password = False
    user.token_version += 1
    audit(db, user, 'CAMBIAR_PASSWORD', 'usuarios', user.id)
    db.commit()
    return {'mensaje': 'Contraseña actualizada. Inicie sesión nuevamente'}
