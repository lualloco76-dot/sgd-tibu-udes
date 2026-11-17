from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Index
from sqlalchemy.sql import func
from app.database import Base

class Auditoria(Base):
    __tablename__ = "auditoria"
    __table_args__ = (Index('ix_auditoria_fecha', 'fecha'),)

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    accion = Column(String, nullable=False)
    entidad = Column(String, nullable=False)
    entidad_id = Column(Integer)
    fecha = Column(DateTime(timezone=True), server_default=func.now())
    detalle = Column(Text)
    parroquia_id = Column(Integer, ForeignKey("parroquias.id"), index=True)

