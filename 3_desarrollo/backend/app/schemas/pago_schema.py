from typing import Literal, Optional

from pydantic import BaseModel, Field


EstadoPago = Literal["Aprobado", "Rechazado"]


class PagoCreate(BaseModel):
    pedido_id: int = Field(gt=0)
    metodo: str = Field(min_length=3, max_length=100)
    ruc_nit_cliente: str = Field(min_length=5, max_length=45)
    estado_transaccion: EstadoPago = "Aprobado"


class FacturaResponse(BaseModel):
    id: int
    numero_factura: str
    ruc_nit_cliente: str
    url_pdf: Optional[str] = None
    fecha_emision: Optional[str] = None
    cliente_nombre: Optional[str] = None
    cliente_direccion: Optional[str] = None
    empresa_nombre: Optional[str] = None
    empresa_nit: Optional[str] = None


class PagoResponse(BaseModel):
    id: int
    metodo: str
    monto: float
    fecha_pago: Optional[str] = None
    estado_transaccion: str
    pedido_id: int
    pedido_estado: str
    factura: Optional[FacturaResponse] = None


class EnvioComprobanteRequest(BaseModel):
    email_destino: Optional[str] = Field(default=None, max_length=100)
