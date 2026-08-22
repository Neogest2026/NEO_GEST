from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.catalogo import Categoria, Producto

router = APIRouter(prefix="/api/v1", tags=["Catálogo"])


def producto_response(producto: Producto, categoria: Optional[Categoria] = None):
    return {
        "id": producto.idProducto,
        "nombre": producto.nombre,
        "descripcion": producto.descripcion,
        "precio_unitario": float(producto.precio_unitario or Decimal("0")),
        "stock_actual": producto.stock_actual,
        "disponible": producto.stock_actual > 0,
        "dimensiones": producto.dimensiones,
        "peso": float(producto.peso) if producto.peso is not None else None,
        "imagen_url": producto.imagen_url,
        "activo": producto.activo,
        "categoria": (
            {"id": categoria.idCategoria, "nombre": categoria.nombre}
            if categoria
            else None
        ),
    }


@router.get("/categorias")
def listar_categorias(db: Session = Depends(get_db)):
    categorias = db.query(Categoria).order_by(Categoria.nombre).all()
    return [{"id": categoria.idCategoria, "nombre": categoria.nombre} for categoria in categorias]


@router.get("/productos")
def listar_productos(
    categoria_id: Optional[int] = None,
    q: Optional[str] = Query(default=None, min_length=1, max_length=80),
    db: Session = Depends(get_db),
):
    consulta = db.query(Producto, Categoria).join(
        Categoria, Producto.Categoria_idCategoria == Categoria.idCategoria
    ).filter(Producto.activo == True)
    if categoria_id is not None:
        consulta = consulta.filter(Producto.Categoria_idCategoria == categoria_id)
    if q:
        termino = f"%{q.strip()}%"
        consulta = consulta.filter(Producto.nombre.ilike(termino))

    productos = consulta.order_by(Producto.nombre).all()
    return [producto_response(producto, categoria) for producto, categoria in productos]


@router.get("/productos/{producto_id}")
def obtener_producto(producto_id: int, db: Session = Depends(get_db)):
    resultado = (
        db.query(Producto, Categoria)
        .join(Categoria, Producto.Categoria_idCategoria == Categoria.idCategoria)
        .filter(Producto.idProducto == producto_id, Producto.activo == True)
        .first()
    )
    if not resultado:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto_response(*resultado)
