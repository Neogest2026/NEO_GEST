from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.catalogo import Producto
from app.models.cliente import Cliente
from app.models.pedido import DetallePedido, Pedido
from app.models.usuario import Usuario
from app.services.pedido_service import cancelar_pedido_pendiente, expirar_pedidos_pendientes
from app.security.security import get_current_user

router = APIRouter(prefix="/api/v1/pedidos", tags=["Pedidos"])


def obtener_cliente_actual(current_user: Usuario, db: Session) -> Cliente:
    cliente = db.query(Cliente).filter(Cliente.Usuario_idUsuario == current_user.idUsuario).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="No existe un cliente asociado al usuario")
    return cliente


def pedido_response(pedido: Pedido, db: Session):
    filas = (
        db.query(DetallePedido, Producto)
        .join(Producto, DetallePedido.Producto_idProducto == Producto.idProducto)
        .filter(DetallePedido.Pedido_idPedido == pedido.idPedido)
        .all()
    )
    return {
        "id": pedido.idPedido,
        "fecha_creacion": pedido.fecha_creacion.isoformat() if pedido.fecha_creacion else None,
        "estado": pedido.estado,
        "total_compra": float(pedido.total_compra),
        "items": [
            {
                "id": detalle.idDetalle_pedido,
                "cantidad": detalle.cantidad,
                "precio_al_momento": float(detalle.precio_al_momento),
                "producto": {
                    "id": producto.idProducto,
                    "nombre": producto.nombre,
                    "imagen_url": producto.imagen_url,
                },
            }
            for detalle, producto in filas
        ],
    }


@router.get("/mis-pedidos")
def listar_mis_pedidos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    cliente = obtener_cliente_actual(current_user, db)
    if expirar_pedidos_pendientes(cliente.idCliente, db):
        db.commit()
    pedidos = (
        db.query(Pedido)
        .filter(Pedido.Cliente_idCliente == cliente.idCliente)
        .order_by(Pedido.idPedido.desc())
        .all()
    )
    return [pedido_response(pedido, db) for pedido in pedidos]


@router.get("/{pedido_id}")
def obtener_mi_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    cliente = obtener_cliente_actual(current_user, db)
    if expirar_pedidos_pendientes(cliente.idCliente, db):
        db.commit()
    pedido = (
        db.query(Pedido)
        .filter(Pedido.idPedido == pedido_id, Pedido.Cliente_idCliente == cliente.idCliente)
        .first()
    )
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return pedido_response(pedido, db)


@router.post("/{pedido_id}/cancelar")
def cancelar_mi_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    cliente = obtener_cliente_actual(current_user, db)
    try:
        pedido = (
            db.query(Pedido)
            .filter(Pedido.idPedido == pedido_id, Pedido.Cliente_idCliente == cliente.idCliente)
            .with_for_update()
            .first()
        )
        if not pedido:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
        cancelar_pedido_pendiente(pedido, db)
        db.commit()
        db.refresh(pedido)
        return {
            "mensaje": "Pedido cancelado y stock liberado",
            **pedido_response(pedido, db),
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No fue posible cancelar el pedido") from exc
