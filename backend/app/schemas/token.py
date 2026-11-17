from pydantic import BaseModel, ConfigDict, Field

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class LoginRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=False)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=256)
    parroquia_id: int | None = Field(default=None, gt=0, strict=True)

class LoginParroquia(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str
    codigo: str
