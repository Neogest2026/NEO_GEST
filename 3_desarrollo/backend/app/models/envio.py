from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class Envio(Base):
    __tablename__ = "envio"

    idEnvio = Column(Integer, primary_key=True, index=True)
    empresa_transporte = Column(String(100), nullable=False)
    codigo_seguimiento = Column(String(45), nullable=False)
    fecha_despacho = Column(DateTime)
    fecha_entrega_estimada = Column(DateTime)
    estado = Column(String(60))
    Pedido_idPedido = Column(Integer, nullable=False, index=True)
    Empleado_idEmpleado = Column(Integer, nullable=False, index=True)
