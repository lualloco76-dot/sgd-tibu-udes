from sqlalchemy import Column, Integer, String, Text
from app.database import Base

class Sacramento(Base):
    __tablename__ = "sacramentos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, nullable=False)
    descripcion = Column(Text)