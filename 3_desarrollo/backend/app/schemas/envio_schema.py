from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


ESTADO_EN_RUTA = "En ruta"


class EnvioCreate(BaseModel):
    pedido_id: int = Field(gt=0)
    empresa_transporte: str = Field(min_length=2, max_length=100)
    codigo_seguimiento: str = Field(min_length=3, max_length=45)
    fecha_despacho: Optional[datetime] = None
    fecha_entrega_estimada: Optional[datetime] = None


class EnvioUpdate(BaseModel):
    empresa_transporte: Optional[str] = Field(default=None, min_length=2, max_length=100)
    codigo_seguimiento: Optional[str] = Field(default=None, min_length=3, max_length=45)
    estado: Optional[str] = Field(default=None, max_length=60)
    fecha_despacho: Optional[datetime] = None
    fecha_entrega_estimada: Optional[datetime] = None


class EnvioResponse(BaseModel):
    id: int
    empresa_transporte: str
    codigo_seguimiento: str
    fecha_despacho: Optional[str] = None
    fecha_entrega_estimada: Optional[str] = None
    estado: Optional[str] = None
    pedido_id: int
    empleado_id: int
    cliente_nombre: Optional[str] = None
    cliente_telefono: Optional[str] = None
    cliente_direccion: Optional[str] = None
    pedido_estado: Optional[str] = None
    pedido_total: Optional[float] = None
    productos: Optional[str] = None
    items_count: Optional[int] = None
    empleado_nombre: Optional[str] = None
    items: Optional[list[dict[str, Any]]] = None
