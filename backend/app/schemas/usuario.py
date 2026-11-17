from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints
from typing import Annotated
from app.models.usuario import RolUsuario
class UsuarioBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True, extra='forbid')
    nombre: str = Field(min_length=2, max_length=200)
    email: EmailStr
    rol: RolUsuario = RolUsuario.CONSULTA
    parroquia_id: int | None = None
class UsuarioCreate(UsuarioBase):
    password: Annotated[str, StringConstraints(strip_whitespace=False)] = Field(min_length=8, max_length=72)
class UsuarioUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    nombre: str | None = Field(None, min_length=2, max_length=200)
    rol: RolUsuario | None = None
    parroquia_id: int | None = None
    activo: bool | None = None
class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str
    email: str
    rol: RolUsuario
    parroquia_id: int | None = None
    activo: bool
    debe_cambiar_password: bool = False
    permisos: dict[str, bool] | None = None
