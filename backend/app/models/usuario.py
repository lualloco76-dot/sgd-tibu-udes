from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from app.database import Base
import enum


class RolUsuario(str, enum.Enum):
    """Roles institucionales del SGD Diócesis de Tibú (tesis de Ingeniería de Sistemas).

    - administrador: configuración técnica, usuarios, parroquias y asignación de roles.
      No adquiere facultades eclesiásticas de firma o aprobación.
    - parroco: custodia parroquial; autoriza y firma certificados de su parroquia.
    - secretario_parroquial: registra y gestiona partidas de su parroquia; prepara
      y genera técnicamente certificados.
    - secretario_general: gestión documental diocesana y coordinación de solicitudes
      entre parroquias; prepara certificados a nivel diocesano.
    - canciller: revisa, aprueba y firma certificados sujetos a competencia de
      la Curia después de la autorización del párroco custodio.
    - auditor: consulta trazabilidad, bitácoras y reportes; no modifica partidas ni
      emite, aprueba o firma certificados.
    - consulta: perfil de lectura restringida dentro de su parroquia.
    """
    ADMINISTRADOR = "administrador"
    PARROCO = "parroco"
    SECRETARIO_PARROQUIAL = "secretario_parroquial"
    SECRETARIO_GENERAL = "secretario_general"
    CANCILLER = "canciller"
    AUDITOR = "auditor"
    CONSULTA = "consulta"


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    rol = Column(String, default=RolUsuario.CONSULTA.value)
    activo = Column(Boolean, default=True)
    parroquia_id = Column(Integer, ForeignKey("parroquias.id"), index=True)
    token_version = Column(Integer, nullable=False, default=0, server_default="0")
    intentos_fallidos = Column(Integer, nullable=False, default=0, server_default="0")
    bloqueado_hasta = Column(DateTime(timezone=True))
    debe_cambiar_password = Column(Boolean, nullable=False, default=False, server_default="false")
