from sqlalchemy import Column, Integer, String

from app.database import Base


class Cliente(Base):
    __tablename__ = "cliente"

    idCliente = Column(Integer, primary_key=True, index=True)
    nombre_completo = Column(String(100))
    telefono = Column(String(20))
    direccion_envio = Column(String(150))
    direccion_facturacion = Column(String(150))
    codigo_postal = Column(String(20))
    Usuario_idUsuario = Column(Integer)

