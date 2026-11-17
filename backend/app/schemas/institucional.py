from datetime import date, datetime
from typing import Literal, Annotated
from pydantic import BaseModel, ConfigDict, Field, model_validator, StringConstraints
class Input(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra='forbid')
class ParroquiaCreate(Input):
    nombre: str = Field(min_length=2, max_length=200)
    codigo: str = Field(min_length=2, max_length=40, pattern=r'^[a-zA-Z0-9_-]+$')
    municipio: str | None = Field(None, max_length=150)
    localidad: str | None = Field(None, max_length=150)
    direccion: str | None = Field(None, max_length=250)
    tipo: Literal['parroquia', 'catedral', 'cuasiparroquia'] = 'parroquia'
class ParroquiaUpdate(Input):
    nombre: str | None = Field(None, min_length=2, max_length=200)
    activa: bool | None = None
    municipio: str | None = Field(None, max_length=150)
    localidad: str | None = Field(None, max_length=150)
    direccion: str | None = Field(None, max_length=250)
    tipo: Literal['parroquia', 'catedral', 'cuasiparroquia'] | None = None
class LibroCreate(Input):
    parroquia_id: int | None = None
    sacramento_id: int = Field(gt=0)
    numero: str = Field(min_length=1, max_length=100)
class SolicitudCreate(Input):
    registro_id: int = Field(gt=0)
    origen_id: int | None = Field(None, gt=0)
    motivo: str = Field(min_length=5, max_length=1000)
class Decision(Input):
    estado: Literal['aprobada', 'rechazada']
    motivo: str = Field(min_length=5, max_length=1000)
class CertificadoCreate(Input):
    registro_id: int = Field(gt=0)
    solicitud_id: int | None = Field(None, gt=0)
    requiere_aprobacion_curia: bool = False
    motivo_curia: str | None = Field(None, max_length=1000)


class ActuacionRequest(Input):
    motivo: str | None = Field(None, max_length=1000)
class PasswordChange(Input):
    actual: Annotated[str, StringConstraints(strip_whitespace=False)]
    nueva: Annotated[str, StringConstraints(strip_whitespace=False)] = Field(min_length=8, max_length=72)
class PasswordReset(Input):
    password: Annotated[str, StringConstraints(strip_whitespace=False)] = Field(min_length=8, max_length=72)
