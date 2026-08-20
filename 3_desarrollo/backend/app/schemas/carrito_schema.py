from pydantic import BaseModel, Field


class ItemCarritoCreate(BaseModel):
    usuario_id: int
    producto_id: int
    cantidad: int = Field(default=1, ge=1)


class ItemCarritoUpdate(BaseModel):
    usuario_id: int
    cantidad: int = Field(ge=1)


class CheckoutRequest(BaseModel):
    usuario_id: int
