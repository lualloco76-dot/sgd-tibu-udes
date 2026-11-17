from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from app.database import Base

class Documento(Base):
    __tablename__ = "documentos"
    __table_args__ = (Index('ix_documentos_registro', 'registro_id'),)

    id = Column(Integer, primary_key=True, index=True)
    registro_id = Column(Integer, ForeignKey("registros_sacramentales.id"), nullable=False)
    tipo_documento = Column(String, nullable=False)
    nombre_archivo = Column(String, nullable=False)
    ruta_archivo = Column(String, nullable=False)
    hash_sha256 = Column(String, nullable=False)
    fecha_subida = Column(DateTime(timezone=True), server_default=func.now())
    subido_por = Column(Integer, ForeignKey("usuarios.id"))
