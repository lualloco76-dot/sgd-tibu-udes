from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioOut, UsuarioUpdate
from app.schemas.institucional import PasswordReset
from app.core.security import hash_password, get_usuario_actual
from app.core.deps import requiere_gestion_usuarios
from app.core.roles import (
    ADMINISTRADOR, SECRETARIO_PARROQUIAL, SECRETARIO_GENERAL, CANCILLER, AUDITOR, CONSULTA,
)
from app.services.access import admin, custodia_escritura, parroquia_destino, scope, audit

router = APIRouter(prefix='/usuarios', tags=['usuarios'])

# Roles que el párroco puede asignar dentro de su propia parroquia.
ROLES_ASIGNABLES_PARROCO = {SECRETARIO_PARROQUIAL, CONSULTA}
# Roles de función diocesana (sin parroquia); solo los asigna el administrador.
ROLES_DIOCESANOS = {ADMINISTRADOR, SECRETARIO_GENERAL, CANCILLER, AUDITOR}


@router.get('/', response_model=list[UsuarioOut])
def listar(db: Session = Depends(get_db), user: Usuario = Depends(requiere_gestion_usuarios), skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200)):
    return scope(db.query(Usuario), Usuario, user).order_by(Usuario.id).offset(skip).limit(limit).all()


@router.post('/', response_model=UsuarioOut, status_code=201)
def crear(data: UsuarioCreate, db: Session = Depends(get_db), user: Usuario = Depends(requiere_gestion_usuarios)):
    rol = data.rol.value
    if not admin(user) and rol not in ROLES_ASIGNABLES_PARROCO:
        raise HTTPException(403, 'No puede asignar ese rol')
    if rol in ROLES_DIOCESANOS and not admin(user):
        raise HTTPException(403, 'Solo el administrador asigna roles diocesanos')
    target = None if rol in ROLES_DIOCESANOS else parroquia_destino(db, user, data.parroquia_id)
    new = Usuario(nombre=data.nombre, email=str(data.email).lower(), rol=rol, parroquia_id=target, password_hash=hash_password(data.password))
    db.add(new); db.flush()
    audit(db, user, 'CREAR_USUARIO', 'usuarios', new.id, parroquia_id=target)
    db.commit()
    return new


@router.patch('/{id}', response_model=UsuarioOut)
def actualizar(id: int, data: UsuarioUpdate, db: Session = Depends(get_db), user: Usuario = Depends(requiere_gestion_usuarios)):
    obj = db.get(Usuario, id)
    if not obj: raise HTTPException(404, 'Usuario no encontrado')
    custodia_escritura(user, obj.parroquia_id)
    if not admin(user) and (obj.rol not in ROLES_ASIGNABLES_PARROCO or (data.rol and data.rol.value not in ROLES_ASIGNABLES_PARROCO)):
        raise HTTPException(403, 'No puede administrar ese rol')
    if not admin(user) and data.rol and data.rol.value in ROLES_DIOCESANOS:
        raise HTTPException(403, 'No puede asignar roles diocesanos')
    if obj.id == user.id and (data.activo is False or data.rol and data.rol.value != user.rol):
        raise HTTPException(409, 'No puede desactivar o degradar su propia cuenta')
    values = data.model_dump(exclude_unset=True)
    for k, v in values.items():
        if v is None and k != 'parroquia_id':
            raise HTTPException(422, 'No se admiten valores nulos')
        setattr(obj, k, v.value if hasattr(v, 'value') else v)
    if obj.rol not in ROLES_DIOCESANOS:
        obj.parroquia_id = parroquia_destino(db, user, obj.parroquia_id)
    else:
        obj.parroquia_id = None
    obj.token_version += 1
    audit(db, user, 'MODIFICAR_USUARIO', 'usuarios', id, parroquia_id=obj.parroquia_id)
    db.commit()
    return obj


@router.post('/{id}/restablecer')
def restablecer(id: int, data: PasswordReset, db: Session = Depends(get_db), user: Usuario = Depends(requiere_gestion_usuarios)):
    obj = db.get(Usuario, id)
    if not obj: raise HTTPException(404, 'Usuario no encontrado')
    custodia_escritura(user, obj.parroquia_id)
    if not admin(user) and obj.rol not in ROLES_ASIGNABLES_PARROCO:
        raise HTTPException(403, 'No puede restablecer ese usuario')
    obj.password_hash = hash_password(data.password); obj.token_version += 1
    obj.debe_cambiar_password = True
    obj.intentos_fallidos = 0; obj.bloqueado_hasta = None
    audit(db, user, 'RESTABLECER_PASSWORD', 'usuarios', id, parroquia_id=obj.parroquia_id)
    db.commit()
    return {'mensaje': 'Contraseña restablecida por administrador autorizado'}
