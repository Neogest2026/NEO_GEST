from sqlalchemy import Boolean, Column, Integer, Numeric, String

from app.database import Base


class Categoria(Base):
    __tablename__ = "categoria"

    idCategoria = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(60), nullable=False)
    descripcion = Column(String(250))


class Producto(Base):
    __tablename__ = "producto"

    idProducto = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(80), nullable=False)
    descripcion = Column(String(250))
    precio_unitario = Column(Numeric(10, 2), nullable=False)
    stock_actual = Column(Integer, nullable=False, default=0)
    dimensiones = Column(String(45))
    peso = Column(Numeric(10, 2))
    imagen_url = Column(String(255))
    activo = Column(Boolean, nullable=False, default=True)
    Categoria_idCategoria = Column(Integer, nullable=False, index=True)
