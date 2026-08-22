from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


EstadoDevolucion = Literal["Solicitada", "Aprobada", "Rechazada"]


class DevolucionCreate(BaseModel):
    pedido_id: int = Field(gt=0)
    motivo: str = Field(min_length=5, max_length=255)


class DevolucionDecision(BaseModel):
    estado: Literal["Aprobada", "Rechazada"]
    monto_reembolso: Optional[float] = Field(default=None, ge=0)


class DevolucionResponse(BaseModel):
    id: int
    fecha_solicitud: Optional[datetime] = None
    motivo: str
    estado: str
    monto_reembolso: float
    pedido_id: int
    pedido_total: Optional[float] = None
    cliente_nombre: Optional[str] = None
    empleado_id: int
    empleado_nombre: Optional[str] = None
