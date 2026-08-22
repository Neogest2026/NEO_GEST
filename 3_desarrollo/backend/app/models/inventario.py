from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class MovimientoInventario(Base):
    __tablename__ = "movimiento_inventario"

    idMovimiento_inventario = Column(Integer, primary_key=True, index=True)
    tipo = Column(String(20), nullable=False)
    cantidad = Column(Integer, nullable=False)
    fecha = Column(DateTime, server_default=func.now())
    observacion = Column(String(255))
    stock_anterior = Column(Integer)
    stock_nuevo = Column(Integer)
    Producto_idProducto = Column(Integer, nullable=False, index=True)
    Empleado_idEmpleado = Column(Integer, nullable=False, index=True)
