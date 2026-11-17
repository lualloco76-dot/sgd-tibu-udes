from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.auditoria import Auditoria
from app.models.usuario import Usuario
from app.core.deps import requiere_auditoria
from app.services.access import scope, scope_auditoria

router = APIRouter(prefix='/auditoria', tags=['auditoria'])


@router.get('/')
def listar(db: Session = Depends(get_db), user: Usuario = Depends(requiere_auditoria), skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200)):
    from app.services.presentacion import responsable, parish
    from app.core.security import aware
    rows = scope(db.query(Auditoria), Auditoria, user, global_read=scope_auditoria(user)).order_by(Auditoria.id.desc()).offset(skip).limit(limit).all()
    return [{**{c.name: getattr(row, c.name) for c in Auditoria.__table__.columns},
             'fecha': aware(row.fecha) if row.fecha else None, 'responsable': responsable(db, row.usuario_id),
             'parroquia': parish(db, row.parroquia_id)} for row in rows]
