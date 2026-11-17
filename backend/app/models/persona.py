from sqlalchemy import Column, Integer, String, Date, ForeignKey
from app.database import Base

class Persona(Base):
    __tablename__ = "personas"

    id = Column(Integer, primary_key=True, index=True)
    nombres = Column(String, nullable=False)
    apellidos = Column(String, nullable=False)
    fecha_nacimiento = Column(Date)
    lugar_nacimiento = Column(String)
    numero_identificacion = Column(String, unique=True, index=True)
    telefono = Column(String)
    email = Column(String)
    parroquia_id = Column(Integer, ForeignKey("parroquias.id"), index=True)
