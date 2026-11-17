from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from app.database import get_db
from app.models.registro import RegistroSacramental as Registro
from app.models.persona import Persona
from app.models.sacramento import Sacramento
from app.models.usuario import Usuario
from app.models.institucional import NotaMarginal, Libro
from app.schemas.registro import RegistroCreate, RegistroUpdate, RegistroOut, NotaCreate, CustodiaCreate
from app.core.security import get_usuario_actual
from app.core.deps import requiere_escritura, requiere_admin
from app.services.access import parroquia_destino, scope, audit, custodia, custodia_escritura, admin
router = APIRouter(prefix='/registros', tags=['registros'])
def validar(db, user, data):
    target = parroquia_destino(db, user, data.parroquia_id)
    person = db.get(Persona, data.persona_id)
    if not person or person.parroquia_id != target: raise HTTPException(422, 'Persona no pertenece a la parroquia custodiante')
    sacrament = db.get(Sacramento, data.sacramento_id)
    if not sacrament: raise HTTPException(422, 'Tipo de registro inexistente')
    if person.fecha_nacimiento and data.fecha_celebracion < person.fecha_nacimiento: raise HTTPException(422, 'Fecha anterior al nacimiento')
    if sacrament.nombre == 'Matrimonio':
        spouse = db.get(Persona, data.datos.get('conyuge_persona_id')) if isinstance(data.datos.get('conyuge_persona_id'), int) else None
        if not spouse or spouse.id == person.id or spouse.parroquia_id != target: raise HTTPException(422, 'Seleccione un segundo cónyuge de su parroquia')
    death = data.datos.get('fecha_defuncion')
    if death:
        try: death_date = date.fromisoformat(str(death))
        except ValueError: raise HTTPException(422, 'Fecha de defunción inválida')
        if death_date > data.fecha_celebracion or person.fecha_nacimiento and death_date < person.fecha_nacimiento: raise HTTPException(422, 'Fecha de defunción inconsistente')
    return target
@router.post('/', response_model=RegistroOut, status_code=201)
def crear(data: RegistroCreate, db: Session = Depends(get_db), user: Usuario = Depends(requiere_escritura)):
    values = data.model_dump(); values['parroquia_id'] = validar(db,user,data)
    if not db.query(Libro).filter_by(parroquia_id=values['parroquia_id'], sacramento_id=data.sacramento_id, numero=data.libro).first():
        raise HTTPException(422, 'Configure el libro de este tipo en la parroquia custodiante')
    obj = Registro(**values); db.add(obj); db.flush()
    audit(db,user,'CREAR','registros_sacramentales',obj.id,parroquia_id=obj.parroquia_id); db.commit()
    return obj
@router.get('/buscar')
def buscar(db: Session = Depends(get_db), user: Usuario = Depends(get_usuario_actual), parroquia_id: int | None = None, sacramento_id: int | None = None, libro: str = Query(..., min_length=1, max_length=100), folio: str = Query(..., min_length=1, max_length=50), numero: str = Query(..., min_length=1, max_length=50)):
    # Discovery by exact archival reference never discloses religious identities.
    query = db.query(Registro).filter(Registro.parroquia_id.isnot(None), Registro.libro == libro, Registro.folio == folio, Registro.numero == numero)
    if parroquia_id: query = query.filter(Registro.parroquia_id == parroquia_id)
    if sacramento_id: query = query.filter(Registro.sacramento_id == sacramento_id)
    return [{'id':r.id,'parroquia_id':r.parroquia_id,'sacramento_id':r.sacramento_id,'libro':r.libro,'folio':r.folio,'numero':r.numero} for r in query.order_by(Registro.id).limit(50)]
@router.get('/', response_model=list[RegistroOut])
def listar(db: Session = Depends(get_db), user: Usuario = Depends(get_usuario_actual), skip: int = Query(0,ge=0), limit: int = Query(50,ge=1,le=200), q: str = Query('',max_length=200), parroquia_id: int | None = None, sacramento_id: int | None = None, libro: str | None = None, folio: str | None = None, numero: str | None = None, desde: date | None = None, hasta: date | None = None):
    if desde and hasta and desde > hasta: raise HTTPException(422, 'El rango de fechas es inválido')
    query = scope(db.query(Registro).options(joinedload(Registro.persona),joinedload(Registro.sacramento)),Registro,user)
    if q: query = query.join(Persona).filter(or_(Persona.nombres.ilike('%'+q+'%'),Persona.apellidos.ilike('%'+q+'%'),(Persona.nombres+' '+Persona.apellidos).ilike('%'+q+'%')))
    for key,value in {'parroquia_id':parroquia_id,'sacramento_id':sacramento_id,'libro':libro,'folio':folio,'numero':numero}.items():
        if value is not None: query = query.filter(getattr(Registro,key)==value)
    if desde: query = query.filter(Registro.fecha_celebracion>=desde)
    if hasta: query = query.filter(Registro.fecha_celebracion<=hasta)
    return query.order_by(Registro.id).offset(skip).limit(limit).all()
@router.get('/{id}/historial')
def historial(id: int, db: Session = Depends(get_db), user: Usuario = Depends(get_usuario_actual)):
    obj = db.get(Registro,id)
    if not obj: raise HTTPException(404,'Registro no encontrado')
    custodia(user,obj.parroquia_id)
    from app.services.presentacion import cambios, responsable
    from app.core.security import aware
    reveal = bool(user.permisos.get('canWrite') or user.permisos.get('canAudit'))
    rows = db.query(NotaMarginal).filter(NotaMarginal.registro_id==id).order_by(NotaMarginal.id).all()
    return [{'id': n.id, 'fecha': aware(n.fecha) if n.fecha else None,
             'responsable': responsable(db, n.usuario_id), 'motivo': n.motivo,
             'accion': 'Asignación de custodia' if n.anterior.get('parroquia_id') is None and n.posterior.get('parroquia_id') and set(n.posterior) == {'parroquia_id'} else 'Corrección de partida / nota marginal',
             'valores_autorizados': reveal, 'cambios': cambios(db, n.anterior, n.posterior, user, reveal),
             'anterior': n.anterior if reveal else {}, 'posterior': n.posterior if reveal else {}}
            for n in rows]
@router.patch('/{id}', response_model=RegistroOut)
def modificar(id: int, data: RegistroUpdate, db: Session = Depends(get_db), user: Usuario = Depends(requiere_escritura)):
    obj = db.query(Registro).filter(Registro.id==id).with_for_update().first()
    if not obj: raise HTTPException(404,'Registro no encontrado')
    custodia_escritura(user,obj.parroquia_id)
    target = validar(db,user,data)
    if obj.parroquia_id and target != obj.parroquia_id: raise HTTPException(409,'La corrección no puede transferir custodia')
    # A historical unchanged book remains editable; a new reference must be configured.
    if (data.libro, data.sacramento_id) != (obj.libro, obj.sacramento_id):
        if not db.query(Libro).filter_by(parroquia_id=target, sacramento_id=data.sacramento_id, numero=data.libro).first():
            raise HTTPException(422, 'Configure el libro de este tipo en la parroquia custodiante')
    keys = list(RegistroCreate.model_fields)
    before = jsonable_encoder({k:getattr(obj,k) for k in keys})
    values = data.model_dump(exclude={'motivo'});values['parroquia_id']=target
    for k,v in values.items(): setattr(obj,k,v)
    db.add(NotaMarginal(registro_id=id,usuario_id=user.id,motivo=data.motivo,anterior=before,posterior=jsonable_encoder(values)))
    audit(db,user,'MODIFICAR','registros_sacramentales',id,parroquia_id=target);db.commit()
    return obj


@router.post('/{id}/notas', status_code=201)
def agregar_nota(id: int, data: NotaCreate, db: Session = Depends(get_db), user: Usuario = Depends(requiere_escritura)):
    obj = db.query(Registro).filter(Registro.id == id).with_for_update().first()
    if not obj:
        raise HTTPException(404, 'Registro no encontrado')
    custodia_escritura(user, obj.parroquia_id)
    previous = obj.notas
    combined = (previous + '\n' if previous else '') + data.texto
    if len(combined) > 5000:
        raise HTTPException(422, 'Las notas exceden el tamaño permitido')
    obj.notas = combined
    note = NotaMarginal(registro_id=id, usuario_id=user.id, motivo=data.motivo,
                        anterior={'notas': previous}, posterior={'notas': combined})
    db.add(note)
    db.flush()
    audit(db, user, 'NOTA_MARGINAL', 'registros_sacramentales', id, parroquia_id=obj.parroquia_id)
    db.commit()
    return {'id': note.id, 'registro_id': id, 'mensaje': 'Nota incorporada con trazabilidad'}


@router.post('/{id}/custodia', response_model=RegistroOut)
def conciliar_custodia(id: int, data: CustodiaCreate, db: Session = Depends(get_db), user: Usuario = Depends(requiere_admin)):
    """Explicit institutional reconciliation of an unassigned historical entry."""
    obj = db.query(Registro).filter(Registro.id == id).with_for_update().first()
    if not obj:
        raise HTTPException(404, 'Registro no encontrado')
    if obj.parroquia_id is not None:
        raise HTTPException(409, 'La custodia ya está asignada; no se permiten transferencias')
    target = parroquia_destino(db, user, data.parroquia_id)
    person = db.query(Persona).filter(Persona.id == obj.persona_id).with_for_update().one()
    if person.parroquia_id not in (None, target):
        raise HTTPException(409, 'La persona tiene otra custodia; requiere conciliación institucional')
    other_custody = db.query(Registro.id).filter(Registro.persona_id == person.id, Registro.parroquia_id.isnot(None), Registro.parroquia_id != target).first()
    if other_custody:
        raise HTTPException(409, 'Existen asientos de la persona en otra custodia')
    person.parroquia_id = target
    obj.parroquia_id = target
    db.add(NotaMarginal(registro_id=id, usuario_id=user.id, motivo=data.motivo,
                        anterior={'parroquia_id': None}, posterior={'parroquia_id': target}))
    audit(db, user, 'ASIGNAR_CUSTODIA', 'registros_sacramentales', id, parroquia_id=target)
    db.commit()
    return obj
