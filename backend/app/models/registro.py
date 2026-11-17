from sqlalchemy import Column, Integer, String, Date, Text, ForeignKey, JSON, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from app.database import Base

class RegistroSacramental(Base):
    __tablename__ = "registros_sacramentales"

    __table_args__ = (UniqueConstraint('parroquia_id', 'sacramento_id', 'libro', 'folio', 'numero', name='uq_asiento_custodia'), Index('ix_registro_fecha', 'fecha_celebracion'), Index('ix_registro_persona', 'persona_id'))
    id = Column(Integer, primary_key=True, index=True)
    persona_id = Column(Integer, ForeignKey("personas.id"), nullable=False)
    sacramento_id = Column(Integer, ForeignKey("sacramentos.id"), nullable=False)
    fecha_celebracion = Column(Date)
    lugar = Column(String)
    ministro = Column(String)
    libro = Column(String)
    folio = Column(String)
    numero = Column(String)
    notas = Column(Text)

    persona = relationship("Persona")
    sacramento = relationship("Sacramento")
    parroquia_id = Column(Integer, ForeignKey("parroquias.id"), index=True)
    datos = Column(JSON, nullable=False, default=dict, server_default="{}")

