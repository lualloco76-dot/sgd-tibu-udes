from pydantic import BaseModel, ConfigDict, Field, EmailStr, field_validator
from app.core.dates import today
from datetime import date
class PersonaBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True, extra='forbid')
    nombres: str = Field(min_length=1, max_length=200)
    apellidos: str = Field(min_length=1, max_length=200)
    fecha_nacimiento: date | None = None
    lugar_nacimiento: str | None = Field(None, max_length=200)
    numero_identificacion: str | None = Field(None, max_length=50)
    telefono: str | None = Field(None, max_length=50)
    email: EmailStr | None = None
    parroquia_id: int | None = None
    @field_validator('fecha_nacimiento')
    @classmethod
    def fecha_pasada(cls, value):
        if value and value > today():
            raise ValueError('La fecha no puede ser futura')
        return value
    @field_validator('numero_identificacion', 'email', mode='before')
    @classmethod
    def vacio_nulo(cls, value):
        return None if value == '' else value
class PersonaCreate(PersonaBase):
    pass
class PersonaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombres: str
    apellidos: str
    fecha_nacimiento: date | None = None
    lugar_nacimiento: str | None = None
    numero_identificacion: str | None = None
    telefono: str | None = None
    email: str | None = None
    parroquia_id: int | None = None
