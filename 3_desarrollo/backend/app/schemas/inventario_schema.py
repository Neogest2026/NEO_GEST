from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


TIPOS_MOVIMIENTO = {"Entrada", "Salida", "Devolucion"}


class MovimientoInventarioCreate(BaseModel):
    producto_id: int = Field(gt=0)
    tipo: str = Field(min_length=5, max_length=20)
    cantidad: int = Field(gt=0)
    observacion: Optional[str] = Field(default=None, max_length=255)

    @field_validator("tipo")
    @classmethod
    def validar_tipo(cls, value: str):
        tipo = value.strip()
        if tipo.lower().startswith("devoluci"):
            tipo = "Devolucion"
        if tipo not in TIPOS_MOVIMIENTO:
            raise ValueError("Tipo de movimiento invalido")
        return tipo


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
