from sqlalchemy import Column, DateTime, Integer, Numeric, String
from sqlalchemy.sql import func

from app.database import Base


class Pago(Base):
    __tablename__ = "pago"

    idPago = Column(Integer, primary_key=True, index=True)
    metodo = Column(String(100), nullable=False)
    monto = Column(Numeric(10, 2), nullable=False)
    fecha_pago = Column(DateTime, server_default=func.now())
    estado_transaccion = Column(String(45))
    Pedido_idPedido = Column(Integer, nullable=False, index=True)


class Factura(Base):
    __tablename__ = "factura"

    idFactura = Column(Integer, primary_key=True, index=True)
    numero_factura = Column(String(45), nullable=False, unique=True)
    ruc_nit_cliente = Column(String(45), nullable=False)
    url_pdf = Column(String(255))
    fecha_emision = Column(DateTime, server_default=func.now())
    Pedido_idPedido = Column(Integer, nullable=False, index=True)
