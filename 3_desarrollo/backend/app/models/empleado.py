from sqlalchemy import Column, Integer, String

from app.database import Base


class Empleado(Base):
    __tablename__ = "empleado"

    idEmpleado = Column(Integer, primary_key=True, index=True)
    nombre_empleado = Column(String(50), nullable=False)
    cargo = Column(String(45))
    id_jefe_master = Column(Integer)
    Usuario_idUsuario = Column(Integer, nullable=False, index=True)
