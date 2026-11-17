from sqlalchemy import Column, Integer, BigInteger, String, Boolean, DateTime, JSON, ForeignKey
from app.database import Base


class PoliticaRol(Base):
    __tablename__ = 'politicas_roles'
    rol = Column(String(40), primary_key=True)
    permisos = Column(JSON, nullable=False, default=dict)
    revision = Column(Integer, nullable=False, default=0)
    actualizado = Column(DateTime(timezone=True))
    actualizado_por = Column(Integer, ForeignKey('usuarios.id'))


class ConfiguracionRespaldo(Base):
    __tablename__ = 'configuracion_respaldos'
    id = Column(Integer, primary_key=True)
    frecuencia = Column(String(15), nullable=False, default='manual')
    hora = Column(Integer, nullable=False, default=2)
    proximo = Column(DateTime(timezone=True))
    en_curso = Column(Boolean, nullable=False, default=False)
    trabajo_id = Column(String(32))
    latido = Column(DateTime(timezone=True))


class Respaldo(Base):
    __tablename__ = 'respaldos'
    id = Column(String(32), primary_key=True)
    origen = Column(String(15), nullable=False)
    estado = Column(String(20), nullable=False, default='en_curso')
    creado = Column(DateTime(timezone=True), nullable=False)
    terminado = Column(DateTime(timezone=True))
    usuario_id = Column(Integer, ForeignKey('usuarios.id'))
    tamano = Column(BigInteger)
    sha256 = Column(String(64))
    verificado = Column(DateTime(timezone=True))
    error = Column(String(300))
