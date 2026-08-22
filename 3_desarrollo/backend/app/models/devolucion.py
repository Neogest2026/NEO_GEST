from sqlalchemy import Column, DateTime, Integer, Numeric, String
from sqlalchemy.sql import func

from app.database import Base


class Devolucion(Base):
    __tablename__ = "devolucion"

    idDevolucion = Column(Integer, primary_key=True, index=True)
    fecha_solicitud = Column(DateTime, server_default=func.now())
    motivo = Column(String(255), nullable=False)
    estado = Column(String(45), nullable=False)
    monto_reembolso = Column(Numeric(10, 2), nullable=False, default=0)
    Pedido_idPedido = Column(Integer, nullable=False, index=True)
    Empleado_idEmpleado = Column(Integer, nullable=False, index=True)
