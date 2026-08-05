from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.carrito import Carrito, ItemCarrito
from app.models.catalogo import Producto
from app.models.cliente import Cliente
from app.schemas.carrito_schema import ItemCarritoCreate, ItemCarritoUpdate

router = APIRouter(prefix="/api/v1/carrito", tags=["Carrito"])


def obtener_cliente(usuario_id: int, db: Session) -> Cliente:
    cliente = db.query(Cliente).filter(Cliente.Usuario_idUsuario == usuario_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="No existe un cliente asociado al usuario")
    return cliente


def obtener_carrito(cliente_id: int, db: Session, crear: bool = False) -> Carrito:
    carrito = db.query(Carrito).filter(Carrito.Cliente_idCliente == cliente_id).first()
    if not carrito and crear:
        carrito = Carrito(Cliente_idCliente=cliente_id)
        db.add(carrito)
        db.flush()
    return carrito


def serializar_carrito(carrito: Carrito, db: Session):
    if not carrito:
        return {"id": None, "items": []}
    filas = (
        db.query(ItemCarrito, Producto)
        .join(Producto, ItemCarrito.Producto_idProducto == Producto.idProducto)
        .filter(ItemCarrito.Carrito_idCarrito == carrito.idCarrito)
        .all()
    )
    return {
        "id": carrito.idCarrito,
        "items": [
            {
                "id": item.iditem_carrito,
                "cantidad": item.cantidad,
                "producto": {
                    "id": producto.idProducto,
                    "nombre": producto.nombre,
                    "precio_unitario": float(producto.precio_unitario),
                    "stock_actual": producto.stock_actual,
                    "imagen_url": producto.imagen_url,
                },
            }
            for item, producto in filas
        ],
    }


@router.get("/{usuario_id}")
def consultar_carrito(usuario_id: int, db: Session = Depends(get_db)):
    cliente = obtener_cliente(usuario_id, db)
    return serializar_carrito(obtener_carrito(cliente.idCliente, db), db)


@router.post("/items", status_code=201)
def agregar_item(data: ItemCarritoCreate, db: Session = Depends(get_db)):
    cliente = obtener_cliente(data.usuario_id, db)
    producto = db.query(Producto).filter(Producto.idProducto == data.producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if producto.stock_actual < data.cantidad:
        raise HTTPException(status_code=409, detail="Stock insuficiente")

    carrito = obtener_carrito(cliente.idCliente, db, crear=True)
    item = (
        db.query(ItemCarrito)
        .filter(
            ItemCarrito.Carrito_idCarrito == carrito.idCarrito,
            ItemCarrito.Producto_idProducto == producto.idProducto,
        )
        .first()
    )
    nueva_cantidad = data.cantidad + (item.cantidad if item else 0)
    if producto.stock_actual < nueva_cantidad:
        raise HTTPException(status_code=409, detail="Stock insuficiente para la cantidad solicitada")
    if item:
        item.cantidad = nueva_cantidad
    else:
        db.add(ItemCarrito(cantidad=data.cantidad, Carrito_idCarrito=carrito.idCarrito, Producto_idProducto=producto.idProducto))
    db.commit()
    return serializar_carrito(carrito, db)


@router.patch("/items/{item_id}")
def actualizar_item(item_id: int, data: ItemCarritoUpdate, db: Session = Depends(get_db)):
    cliente = obtener_cliente(data.usuario_id, db)
    carrito = obtener_carrito(cliente.idCliente, db)
    item = db.query(ItemCarrito).filter(ItemCarrito.iditem_carrito == item_id).first()
    if not carrito or not item or item.Carrito_idCarrito != carrito.idCarrito:
        raise HTTPException(status_code=404, detail="Ítem del carrito no encontrado")
    producto = db.query(Producto).filter(Producto.idProducto == item.Producto_idProducto).first()
    if producto.stock_actual < data.cantidad:
        raise HTTPException(status_code=409, detail="Stock insuficiente")
    item.cantidad = data.cantidad
    db.commit()
    return serializar_carrito(carrito, db)


@router.delete("/items/{item_id}")
def eliminar_item(item_id: int, usuario_id: int, db: Session = Depends(get_db)):
    cliente = obtener_cliente(usuario_id, db)
    carrito = obtener_carrito(cliente.idCliente, db)
    item = db.query(ItemCarrito).filter(ItemCarrito.iditem_carrito == item_id).first()
    if not carrito or not item or item.Carrito_idCarrito != carrito.idCarrito:
        raise HTTPException(status_code=404, detail="Ítem del carrito no encontrado")
    db.delete(item)
    db.commit()
    return {"mensaje": "Ítem eliminado"}
