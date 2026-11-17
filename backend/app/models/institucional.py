from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, JSON, UniqueConstraint, CheckConstraint
from sqlalchemy.sql import func
from app.database import Base


class Parroquia(Base):
    __tablename__ = 'parroquias'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(200), nullable=False)
    codigo = Column(String(40), nullable=False, unique=True)
    activa = Column(Boolean, nullable=False, default=True)
    municipio = Column(String(150))
    localidad = Column(String(150))
    direccion = Column(String(250))
    tipo = Column(String(30), nullable=False, default='parroquia', server_default='parroquia')


class Libro(Base):
    __tablename__ = 'libros'
    __table_args__ = (UniqueConstraint('parroquia_id', 'sacramento_id', 'numero', name='uq_libro_custodia'),)
    id = Column(Integer, primary_key=True)
    parroquia_id = Column(Integer, ForeignKey('parroquias.id'), nullable=False, index=True)
    sacramento_id = Column(Integer, ForeignKey('sacramentos.id'), nullable=False)
    numero = Column(String(100), nullable=False)


class Solicitud(Base):
    __tablename__ = 'solicitudes'
    __table_args__ = (
        CheckConstraint("estado IN ('pendiente','aprobada','rechazada')", name='ck_solicitud_estado'),
    )
    id = Column(Integer, primary_key=True)
    registro_id = Column(Integer, ForeignKey('registros_sacramentales.id'), nullable=False, index=True)
    origen_id = Column(Integer, ForeignKey('parroquias.id'), nullable=False, index=True)
    destino_id = Column(Integer, ForeignKey('parroquias.id'), nullable=False, index=True)
    solicitante_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    estado = Column(String(20), nullable=False, default='pendiente', server_default='pendiente')
    motivo = Column(Text, nullable=False)
    decision_motivo = Column(Text)
    responsable_id = Column(Integer, ForeignKey('usuarios.id'))
    fecha_creacion = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    fecha_decision = Column(DateTime(timezone=True))
    # Trámites de competencia diocesana (Curia).
    requiere_aprobacion_curia = Column(Boolean, nullable=False, default=False, server_default='false')
    aprobado_curia_por = Column(Integer, ForeignKey('usuarios.id'))
    fecha_aprobacion_curia = Column(DateTime(timezone=True))
    motivo_curia = Column(Text)


class Certificado(Base):
    """Certificado con ciclo de vida institucional.

    Estados:
      preparado -> autorizado -> (aprobado_curia) -> firmado -> (anulado)

    `emitido_por`/`fecha_emision` registran la generación técnica (preparación) del
    documento y su instantánea. La autorización, la aprobación de Curia y la firma
    se registran por separado. Un certificado solo es descargable en estado `firmado`.
    """
    __tablename__ = 'certificados'
    __table_args__ = (
        CheckConstraint("estado IN ('preparado','autorizado','aprobado_curia','firmado','anulado')", name='ck_certificado_estado'),
    )
    id = Column(Integer, primary_key=True)
    numero = Column(String(60), nullable=False, unique=True)
    registro_id = Column(Integer, ForeignKey('registros_sacramentales.id'), nullable=False, index=True)
    solicitud_id = Column(Integer, ForeignKey('solicitudes.id'))
    emitido_por = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    parroquia_id = Column(Integer, ForeignKey('parroquias.id'), nullable=False, index=True)
    codigo_verificacion = Column(String(100), nullable=False, unique=True)
    fecha_emision = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    instantanea = Column(JSON, nullable=False)
    estado = Column(String(20), nullable=False, default='preparado', server_default='preparado')
    autorizado_por = Column(Integer, ForeignKey('usuarios.id'))
    fecha_autorizacion = Column(DateTime(timezone=True))
    requiere_aprobacion_curia = Column(Boolean, nullable=False, default=False, server_default='false')
    aprobado_curia_por = Column(Integer, ForeignKey('usuarios.id'))
    fecha_aprobacion_curia = Column(DateTime(timezone=True))
    motivo_curia = Column(Text)
    firmado_por = Column(Integer, ForeignKey('usuarios.id'))
    fecha_firma = Column(DateTime(timezone=True))


class NotaMarginal(Base):
    __tablename__ = 'notas_marginales'
    id = Column(Integer, primary_key=True)
    registro_id = Column(Integer, ForeignKey('registros_sacramentales.id'), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    fecha = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    motivo = Column(Text, nullable=False)
    anterior = Column(JSON, nullable=False)
    posterior = Column(JSON, nullable=False)


class Sesion(Base):
    __tablename__ = 'sesiones'
    id = Column(String(64), primary_key=True)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False, index=True)
    expira = Column(DateTime(timezone=True), nullable=False)
    revocada = Column(Boolean, nullable=False, default=False)
