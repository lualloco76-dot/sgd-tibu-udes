from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.persona import Persona
from app.models.usuario import Usuario
from app.models.registro import RegistroSacramental
from app.schemas.persona import PersonaCreate, PersonaOut
from app.core.security import get_usuario_actual
from app.core.deps import requiere_escritura
from app.services.access import parroquia_destino, scope, audit, custodia_escritura
router = APIRouter(prefix='/personas', tags=['personas'])
@router.post('/', response_model=PersonaOut, status_code=201)
def crear(data: PersonaCreate, db: Session = Depends(get_db), user: Usuario = Depends(requiere_escritura)):
    values = data.model_dump(); values['parroquia_id'] = parroquia_destino(db, user, data.parroquia_id)
    obj = Persona(**values); db.add(obj); db.flush()
    audit(db, user, 'CREAR', 'personas', obj.id, parroquia_id=obj.parroquia_id); db.commit()
    return obj
@router.get('/', response_model=list[PersonaOut])
def listar(db: Session = Depends(get_db), user: Usuario = Depends(get_usuario_actual), skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200), q: str = Query('', max_length=200)):
    query = scope(db.query(Persona), Persona, user)
    if q: query = query.filter(or_(Persona.nombres.ilike('%'+q+'%'), Persona.apellidos.ilike('%'+q+'%')))
    return query.order_by(Persona.id).offset(skip).limit(limit).all()


@router.patch('/{id}', response_model=PersonaOut)
def actualizar(id: int, data: PersonaCreate, db: Session = Depends(get_db), user: Usuario = Depends(requiere_escritura)):
    obj = db.query(Persona).filter(Persona.id == id).with_for_update().first()
    if not obj:
        raise HTTPException(404, 'Persona no encontrada')
    custodia_escritura(user, obj.parroquia_id)
    target = parroquia_destino(db, user, data.parroquia_id if data.parroquia_id is not None else obj.parroquia_id)
    if target != obj.parroquia_id:
        raise HTTPException(409, 'La edición de una persona no puede transferir custodia')
    if data.fecha_nacimiento and db.query(RegistroSacramental.id).filter(
            RegistroSacramental.persona_id == id,
            RegistroSacramental.fecha_celebracion < data.fecha_nacimiento).first():
        raise HTTPException(422, 'El nacimiento no puede ser posterior a una partida existente')
    for key, value in data.model_dump(exclude={'parroquia_id'}).items():
        setattr(obj, key, value)
    audit(db, user, 'MODIFICAR', 'personas', id, parroquia_id=target)
    db.commit()
    return obj
