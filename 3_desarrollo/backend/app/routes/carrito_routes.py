from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.carrito import Carrito, ItemCarrito
from app.models.catalogo import Producto
from app.models.cliente import Cliente
from app.models.pedido import DetallePedido, Pedido
from app.models.usuario import Usuario
from app.schemas.carrito_schema import CheckoutRequest, ItemCarritoCreate, ItemCarritoUpdate
from app.security.security import ensure_same_user_or_admin, get_current_user

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
def consultar_carrito(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    ensure_same_user_or_admin(usuario_id, current_user)
    cliente = obtener_cliente(usuario_id, db)
    return serializar_carrito(obtener_carrito(cliente.idCliente, db), db)


@router.post("/items", status_code=201)
def agregar_item(
    data: ItemCarritoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    ensure_same_user_or_admin(data.usuario_id, current_user)
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
        db.add(
            ItemCarrito(
                cantidad=data.cantidad,
                Carrito_idCarrito=carrito.idCarrito,
                Producto_idProducto=producto.idProducto,
            )
        )
    db.commit()
    return serializar_carrito(carrito, db)


@router.patch("/items/{item_id}")
def actualizar_item(
    item_id: int,
    data: ItemCarritoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    ensure_same_user_or_admin(data.usuario_id, current_user)
    cliente = obtener_cliente(data.usuario_id, db)
    carrito = obtener_carrito(cliente.idCliente, db)
    item = db.query(ItemCarrito).filter(ItemCarrito.iditem_carrito == item_id).first()
    if not carrito or not item or item.Carrito_idCarrito != carrito.idCarrito:
        raise HTTPException(status_code=404, detail="Item del carrito no encontrado")
    producto = db.query(Producto).filter(Producto.idProducto == item.Producto_idProducto).first()
    if producto.stock_actual < data.cantidad:
        raise HTTPException(status_code=409, detail="Stock insuficiente")
    item.cantidad = data.cantidad
    db.commit()
    return serializar_carrito(carrito, db)


@router.delete("/items/{item_id}")
def eliminar_item(
    item_id: int,
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    ensure_same_user_or_admin(usuario_id, current_user)
    cliente = obtener_cliente(usuario_id, db)
    carrito = obtener_carrito(cliente.idCliente, db)
    item = db.query(ItemCarrito).filter(ItemCarrito.iditem_carrito == item_id).first()
    if not carrito or not item or item.Carrito_idCarrito != carrito.idCarrito:
        raise HTTPException(status_code=404, detail="Item del carrito no encontrado")
    db.delete(item)
    db.commit()
    return {"mensaje": "Item eliminado"}


@router.post("/checkout", status_code=201)
def confirmar_checkout(
    data: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    ensure_same_user_or_admin(data.usuario_id, current_user)
    try:
        cliente = obtener_cliente(data.usuario_id, db)
        carrito = obtener_carrito(cliente.idCliente, db)
        if not carrito:
            raise HTTPException(status_code=400, detail="El carrito esta vacio")

        filas = (
            db.query(ItemCarrito, Producto)
            .join(Producto, ItemCarrito.Producto_idProducto == Producto.idProducto)
            .filter(ItemCarrito.Carrito_idCarrito == carrito.idCarrito)
            .all()
        )
        if not filas:
            raise HTTPException(status_code=400, detail="El carrito esta vacio")

        for item, producto in filas:
            if producto.stock_actual < item.cantidad:
                raise HTTPException(status_code=409, detail=f"Stock insuficiente para {producto.nombre}")

        total = sum(producto.precio_unitario * item.cantidad for item, producto in filas)
        pedido = Pedido(
            estado="Pendiente",
            total_compra=total,
            Cliente_idCliente=cliente.idCliente,
        )
        db.add(pedido)
        db.flush()

        detalle_response = []
        for item, producto in filas:
            db.add(
                DetallePedido(
                    cantidad=item.cantidad,
                    precio_al_momento=producto.precio_unitario,
                    Producto_idProducto=producto.idProducto,
                    Pedido_idPedido=pedido.idPedido,
                )
            )
            producto.stock_actual -= item.cantidad
            detalle_response.append(
                {
                    "producto_id": producto.idProducto,
                    "nombre": producto.nombre,
                    "cantidad": item.cantidad,
                    "precio_al_momento": float(producto.precio_unitario),
                }
            )
            db.delete(item)

        db.commit()

        return {
            "mensaje": "Pedido creado correctamente",
            "idPedido": pedido.idPedido,
            "estado": pedido.estado,
            "total_compra": float(total),
            "items": detalle_response,
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No fue posible confirmar el pedido") from exc
