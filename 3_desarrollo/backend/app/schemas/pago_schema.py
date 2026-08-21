from typing import Literal, Optional

from pydantic import BaseModel, Field


EstadoPago = Literal["Aprobado", "Rechazado"]


class PagoCreate(BaseModel):
    pedido_id: int = Field(gt=0)
    metodo: str = Field(min_length=3, max_length=100)
    ruc_nit_cliente: str = Field(min_length=5, max_length=45)
    estado_transaccion: EstadoPago = "Aprobado"


class EnvioComprobanteRequest(BaseModel):
    email_destino: Optional[str] = Field(default=None, max_length=100)
