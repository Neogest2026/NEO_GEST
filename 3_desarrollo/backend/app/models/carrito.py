from sqlalchemy import Column, DateTime, Integer
from sqlalchemy.sql import func

from app.database import Base


class Carrito(Base):
    __tablename__ = "carrito"

    idCarrito = Column(Integer, primary_key=True, index=True)
    fecha_actualizacion = Column(DateTime, server_default=func.now(), onupdate=func.now())
    Cliente_idCliente = Column(Integer, nullable=False, index=True)


class ItemCarrito(Base):
    __tablename__ = "item_carrito"

    iditem_carrito = Column(Integer, primary_key=True, index=True)
    cantidad = Column(Integer, nullable=False)
    Carrito_idCarrito = Column(Integer, nullable=False, index=True)
    Producto_idProducto = Column(Integer, nullable=False, index=True)
