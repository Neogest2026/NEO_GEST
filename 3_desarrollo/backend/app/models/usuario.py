from sqlalchemy import Column, Integer, String

from app.database import Base


class Usuario(Base):
    __tablename__ = "Usuario"

    idUsuario = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True)
    password_hash = Column(String(255))
    estado = Column(Integer, default=1)
    Rol_idRol = Column(Integer)
