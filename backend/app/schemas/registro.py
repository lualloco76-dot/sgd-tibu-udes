from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.core.dates import today
from datetime import date
from app.schemas.persona import PersonaOut
from app.schemas.sacramento import SacramentoOut
class RegistroBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True, extra='forbid')
    persona_id: int = Field(gt=0)
    sacramento_id: int = Field(gt=0)
    parroquia_id: int | None = None
    fecha_celebracion: date
    lugar: str | None = Field(None, max_length=200)
    ministro: str | None = Field(None, max_length=200)
    libro: str = Field(min_length=1, max_length=100)
    folio: str = Field(min_length=1, max_length=50)
    numero: str = Field(min_length=1, max_length=50)
    notas: str | None = Field(None, max_length=5000)
    datos: dict[str, str | int | None] = Field(default_factory=dict)
    @field_validator('fecha_celebracion')
    @classmethod
    def pasada(cls, value):
        if value > today(): raise ValueError('La fecha no puede ser futura')
        return value
    @field_validator('datos')
    @classmethod
    def limitar(cls, value):
        if len(value) > 30 or any(len(k)>100 or len(str(v))>1000 for k,v in value.items()): raise ValueError('Datos adicionales exceden el tamaño permitido')
        return value
class RegistroCreate(RegistroBase):
    pass
class RegistroUpdate(RegistroBase):
    motivo: str = Field(min_length=5, max_length=1000)
class RegistroOut(BaseModel):
    """Reads tolerate incomplete historical entries; writes remain strictly validated."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    persona_id: int
    sacramento_id: int
    parroquia_id: int | None = None
    fecha_celebracion: date | None = None
    lugar: str | None = None
    ministro: str | None = None
    libro: str | None = None
    folio: str | None = None
    numero: str | None = None
    notas: str | None = None
    datos: dict = Field(default_factory=dict)
    persona: PersonaOut
    sacramento: SacramentoOut

class NotaCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')
    texto: str = Field(min_length=1, max_length=5000)
    motivo: str = Field(min_length=5, max_length=1000)

class CustodiaCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')
    parroquia_id: int = Field(gt=0)
    motivo: str = Field(min_length=5, max_length=1000)
