from sqlalchemy import Column, DateTime, Integer, Numeric, String
from sqlalchemy.sql import func

from app.database import Base


class Pedido(Base):
    __tablename__ = "pedido"

    idPedido = Column(Integer, primary_key=True, index=True)
    fecha_creacion = Column(DateTime, server_default=func.now())
    estado = Column(String(45), nullable=False)
    total_compra = Column(Numeric(10, 2), nullable=False)
    Cliente_idCliente = Column(Integer, nullable=False, index=True)


class DetallePedido(Base):
    __tablename__ = "detalle_pedido"

    idDetalle_pedido = Column(Integer, primary_key=True, index=True)
    cantidad = Column(Integer, nullable=False)
    precio_al_momento = Column(Numeric(10, 2), nullable=False)
    Producto_idProducto = Column(Integer, nullable=False, index=True)
    Pedido_idPedido = Column(Integer, nullable=False, index=True)
