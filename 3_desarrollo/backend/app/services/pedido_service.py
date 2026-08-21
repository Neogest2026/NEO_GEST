from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import PENDING_ORDER_EXPIRATION_MINUTES
from app.models.catalogo import Producto
from app.models.pedido import DetallePedido, Pedido

ESTADO_PENDIENTE = "Pendiente"
ESTADO_CANCELADO = "Cancelado"
ESTADO_VENCIDO = "Vencido"


def restaurar_stock_pedido(pedido: Pedido, db: Session):
    detalles = (
        db.query(DetallePedido)
        .filter(DetallePedido.Pedido_idPedido == pedido.idPedido)
        .all()
    )
    for detalle in detalles:
        producto = (
            db.query(Producto)
            .filter(Producto.idProducto == detalle.Producto_idProducto)
            .with_for_update()
            .first()
        )
        if producto:
            producto.stock_actual += detalle.cantidad


def cancelar_pedido_pendiente(pedido: Pedido, db: Session, estado_final: str = ESTADO_CANCELADO):
    if pedido.estado != ESTADO_PENDIENTE:
        raise HTTPException(status_code=409, detail=f"El pedido no puede cancelarse en estado {pedido.estado}")

    restaurar_stock_pedido(pedido, db)
    pedido.estado = estado_final
    return pedido


def _query_pedidos_pendientes_vencidos(db: Session, cliente_id: int | None = None):
    if PENDING_ORDER_EXPIRATION_MINUTES <= 0:
        return []

    fecha_limite = datetime.utcnow() - timedelta(minutes=PENDING_ORDER_EXPIRATION_MINUTES)
    query = db.query(Pedido).filter(
        Pedido.estado == ESTADO_PENDIENTE,
        Pedido.fecha_creacion <= fecha_limite,
    )
    if cliente_id is not None:
        query = query.filter(Pedido.Cliente_idCliente == cliente_id)
    return query.with_for_update().all()


def expirar_pedidos_pendientes(cliente_id: int, db: Session):
    pedidos = _query_pedidos_pendientes_vencidos(db, cliente_id)
    expirados = 0
    for pedido in pedidos:
        cancelar_pedido_pendiente(pedido, db, ESTADO_VENCIDO)
        expirados += 1
    return expirados


def expirar_todos_los_pedidos_pendientes(db: Session):
    pedidos = _query_pedidos_pendientes_vencidos(db)
    expirados = 0
    for pedido in pedidos:
        cancelar_pedido_pendiente(pedido, db, ESTADO_VENCIDO)
        expirados += 1
    return expirados
