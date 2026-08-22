from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.catalogo import Producto
from app.models.cliente import Cliente
from app.models.envio import Envio
from app.models.pago import Pago
from app.models.pedido import DetallePedido, Pedido
from app.models.usuario import Usuario
from app.security.security import require_roles

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])

ROLES_DASHBOARD = [1, 2]


def decimal_to_float(value):
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def serialize_datetime(value):
    return value.isoformat() if value else None


def obtener_items_pedido(pedido_id: int, db: Session):
    filas = (
        db.query(DetallePedido, Producto)
        .join(Producto, DetallePedido.Producto_idProducto == Producto.idProducto)
        .filter(DetallePedido.Pedido_idPedido == pedido_id)
        .all()
    )
    return [
        {
            "id": detalle.idDetalle_pedido,
            "cantidad": detalle.cantidad,
            "precio_al_momento": decimal_to_float(detalle.precio_al_momento),
            "subtotal": decimal_to_float(detalle.precio_al_momento) * detalle.cantidad,
            "producto": {
                "id": producto.idProducto,
                "nombre": producto.nombre,
                "imagen_url": producto.imagen_url,
            },
        }
        for detalle, producto in filas
    ]


def obtener_envio_pedido(pedido_id: int, db: Session):
    envio = db.query(Envio).filter(Envio.Pedido_idPedido == pedido_id).first()
    if not envio:
        return None
    return {
        "id": envio.idEnvio,
        "estado": envio.estado,
        "empresa_transporte": envio.empresa_transporte,
        "codigo_seguimiento": envio.codigo_seguimiento,
        "fecha_despacho": serialize_datetime(envio.fecha_despacho),
        "fecha_entrega_estimada": serialize_datetime(envio.fecha_entrega_estimada),
    }


def pedido_dashboard_response(pedido: Pedido, cliente: Cliente, db: Session):
    items = obtener_items_pedido(pedido.idPedido, db)
    return {
        "id": pedido.idPedido,
        "cliente": {
            "id": cliente.idCliente,
            "nombre": cliente.nombre_completo,
            "telefono": cliente.telefono,
            "direccion_envio": cliente.direccion_envio,
        },
        "fecha_creacion": serialize_datetime(pedido.fecha_creacion),
        "estado": pedido.estado,
        "total_compra": decimal_to_float(pedido.total_compra),
        "items_count": sum(item["cantidad"] for item in items),
        "productos": ", ".join(item["producto"]["nombre"] for item in items),
        "items": items,
        "envio": obtener_envio_pedido(pedido.idPedido, db),
    }


@router.get("/resumen")
def obtener_resumen_dashboard(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(ROLES_DASHBOARD)),
):
    ventas_totales = (
        db.query(func.coalesce(func.sum(Pago.monto), 0))
        .filter(Pago.estado_transaccion == "Aprobado")
        .scalar()
    )
    pedidos_pendientes = db.query(func.count(Pedido.idPedido)).filter(Pedido.estado == "Pendiente").scalar()
    productos_en_stock = (
        db.query(func.coalesce(func.sum(Producto.stock_actual), 0))
        .filter(Producto.activo == True)
        .scalar()
    )
    productos_bajo_stock = (
        db.query(func.count(Producto.idProducto))
        .filter(Producto.activo == True, Producto.stock_actual > 0, Producto.stock_actual <= 5)
        .scalar()
    )
    productos_agotados = (
        db.query(func.count(Producto.idProducto))
        .filter(Producto.activo == True, Producto.stock_actual == 0)
        .scalar()
    )
    envios_en_transito = db.query(func.count(Envio.idEnvio)).filter(Envio.estado == "En ruta").scalar()
    pedidos_pagados = db.query(func.count(Pedido.idPedido)).filter(Pedido.estado == "Pagado").scalar()

    pedidos = (
        db.query(Pedido, Cliente)
        .join(Cliente, Pedido.Cliente_idCliente == Cliente.idCliente)
        .order_by(Pedido.idPedido.desc())
        .limit(100)
        .all()
    )

    return {
        "metricas": {
            "ventas_totales": decimal_to_float(ventas_totales),
            "pedidos_pendientes": pedidos_pendientes or 0,
            "productos_en_stock": int(productos_en_stock or 0),
            "productos_bajo_stock": productos_bajo_stock or 0,
            "productos_agotados": productos_agotados or 0,
            "envios_en_transito": envios_en_transito or 0,
            "pedidos_pagados": pedidos_pagados or 0,
        },
        "ultimos_pedidos": [
            pedido_dashboard_response(pedido, cliente, db)
            for pedido, cliente in pedidos
        ],
    }
