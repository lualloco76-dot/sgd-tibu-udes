from pydantic import BaseModel, ConfigDict
from typing import Optional

class SacramentoBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

class SacramentoCreate(SacramentoBase):
    pass

class SacramentoOut(SacramentoBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
