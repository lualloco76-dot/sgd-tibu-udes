from pydantic import BaseModel, ConfigDict
from datetime import datetime
class DocumentoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    registro_id: int
    tipo_documento: str
    nombre_archivo: str
    hash_sha256: str
    fecha_subida: datetime
    subido_por: int | None = None
    referencia: dict[str, str | None] | None = None
