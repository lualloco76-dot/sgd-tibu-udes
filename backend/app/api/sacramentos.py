from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.core.security import get_usuario_actual
from app.models.sacramento import Sacramento
from app.schemas.sacramento import SacramentoOut

router = APIRouter(prefix="/sacramentos", tags=["sacramentos"])

@router.get("/", response_model=List[SacramentoOut])
def listar_sacramentos(db: Session = Depends(get_db), usuario = Depends(get_usuario_actual)):
    return db.query(Sacramento).all()