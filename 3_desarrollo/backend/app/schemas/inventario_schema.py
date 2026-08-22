from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


TipoMovimiento = Literal["Entrada", "Salida", "Devolución"]


class MovimientoInventarioCreate(BaseModel):
    producto_id: int = Field(gt=0)
    tipo: TipoMovimiento
    cantidad: int = Field(gt=0)
    observacion: Optional[str] = Field(default=None, max_length=255)


class MovimientoInventarioResponse(BaseModel):
    id: int
    tipo: str
    cantidad: int
    fecha: Optional[datetime] = None
    observacion: Optional[str] = None
    producto_id: int
    producto_nombre: str
    empleado_id: int
    empleado_nombre: str
    stock_anterior: Optional[int] = None
    stock_nuevo: int
