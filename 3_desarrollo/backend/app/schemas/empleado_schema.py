from pydantic import BaseModel, Field


class EmpleadoCreate(BaseModel):
    email: str
    password: str = Field(min_length=6)
    nombre_empleado: str = Field(min_length=3, max_length=50)
    cargo: str = Field(min_length=2, max_length=45)
