from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.catalogo import Producto
from app.models.cliente import Cliente
from app.models.envio import Envio
from app.models.pago import Factura, Pago
from app.models.pedido import DetallePedido, Pedido
from app.models.usuario import Usuario
from app.services.pedido_service import cancelar_pedido_pendiente, expirar_pedidos_pendientes
from app.security.security import get_current_user, require_roles

router = APIRouter(prefix="/api/v1/pedidos", tags=["Pedidos"])

ROLES_PEDIDOS = [1, 2]


def decimal_to_float(value):
    return float(value or 0)


def serialize_datetime(value):
    return value.isoformat() if value else None


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
                "activo": producto.activo,
            },
        }
        for detalle, producto in filas
    ]


def obtener_pago_pedido(pedido_id: int, db: Session):
    pago = (
        db.query(Pago)
        .filter(Pago.Pedido_idPedido == pedido_id)
        .order_by(Pago.idPago.desc())
        .first()
    )
    if not pago:
        return None
    return {
        "id": pago.idPago,
        "metodo": pago.metodo,
        "monto": decimal_to_float(pago.monto),
        "estado_transaccion": pago.estado_transaccion,
        "fecha_pago": serialize_datetime(pago.fecha_pago),
    }


def obtener_factura_pedido(pedido_id: int, db: Session):
    factura = db.query(Factura).filter(Factura.Pedido_idPedido == pedido_id).first()
    if not factura:
        return None
    return {
        "id": factura.idFactura,
        "numero_factura": factura.numero_factura,
        "ruc_nit_cliente": factura.ruc_nit_cliente,
        "url_pdf": factura.url_pdf or f"/api/v1/pagos/facturas/{factura.idFactura}/pdf",
        "fecha_emision": serialize_datetime(factura.fecha_emision),
    }


def obtener_envio_pedido(pedido_id: int, db: Session):
    envio = db.query(Envio).filter(Envio.Pedido_idPedido == pedido_id).first()
    if not envio:
        return None
    return {
        "id": envio.idEnvio,
        "empresa_transporte": envio.empresa_transporte,
        "codigo_seguimiento": envio.codigo_seguimiento,
        "estado": envio.estado,
        "fecha_despacho": serialize_datetime(envio.fecha_despacho),
        "fecha_entrega_estimada": serialize_datetime(envio.fecha_entrega_estimada),
        "empleado_id": envio.Empleado_idEmpleado,
    }


def pedido_admin_response(pedido: Pedido, cliente: Cliente, db: Session):
    items = obtener_items_pedido(pedido.idPedido, db)
    return {
        "id": pedido.idPedido,
        "fecha_creacion": serialize_datetime(pedido.fecha_creacion),
        "estado": pedido.estado,
        "total_compra": decimal_to_float(pedido.total_compra),
        "items_count": sum(item["cantidad"] for item in items),
        "productos": ", ".join(item["producto"]["nombre"] for item in items),
        "cliente": {
            "id": cliente.idCliente,
            "nombre": cliente.nombre_completo,
            "telefono": cliente.telefono,
            "direccion_envio": cliente.direccion_envio,
            "direccion_facturacion": cliente.direccion_facturacion,
        },
        "items": items,
        "pago": obtener_pago_pedido(pedido.idPedido, db),
        "factura": obtener_factura_pedido(pedido.idPedido, db),
        "envio": obtener_envio_pedido(pedido.idPedido, db),
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


@router.get("/admin/resumen")
def listar_pedidos_admin(
    estado: str | None = Query(default=None, max_length=45),
    cliente: str | None = Query(default=None, max_length=80),
    producto: str | None = Query(default=None, max_length=80),
    fecha_desde: datetime | None = Query(default=None),
    fecha_hasta: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(ROLES_PEDIDOS)),
):
    if expirar_pedidos_pendientes(None, db):
        db.commit()

    consulta = db.query(Pedido, Cliente).join(Cliente, Pedido.Cliente_idCliente == Cliente.idCliente)
    if estado:
        consulta = consulta.filter(Pedido.estado == estado.strip())
    if cliente:
        termino_cliente = f"%{cliente.strip()}%"
        consulta = consulta.filter(Cliente.nombre_completo.ilike(termino_cliente))
    if fecha_desde:
        consulta = consulta.filter(Pedido.fecha_creacion >= fecha_desde)
    if fecha_hasta:
        consulta = consulta.filter(Pedido.fecha_creacion <= fecha_hasta)
    if producto:
        termino_producto = f"%{producto.strip()}%"
        consulta = (
            consulta
            .join(DetallePedido, DetallePedido.Pedido_idPedido == Pedido.idPedido)
            .join(Producto, DetallePedido.Producto_idProducto == Producto.idProducto)
            .filter(Producto.nombre.ilike(termino_producto))
            .distinct()
        )

    filas = consulta.order_by(Pedido.idPedido.desc()).limit(200).all()

    ventas_pagadas = (
        db.query(func.coalesce(func.sum(Pago.monto), 0))
        .filter(Pago.estado_transaccion == "Aprobado")
        .scalar()
    )
    metricas = {
        "total_pedidos": db.query(func.count(Pedido.idPedido)).scalar() or 0,
        "pendientes": db.query(func.count(Pedido.idPedido)).filter(Pedido.estado == "Pendiente").scalar() or 0,
        "pagados": db.query(func.count(Pedido.idPedido)).filter(Pedido.estado == "Pagado").scalar() or 0,
        "cancelados": db.query(func.count(Pedido.idPedido)).filter(Pedido.estado == "Cancelado").scalar() or 0,
        "vencidos": db.query(func.count(Pedido.idPedido)).filter(Pedido.estado == "Vencido").scalar() or 0,
        "ventas_pagadas": decimal_to_float(ventas_pagadas),
        "con_envio": db.query(func.count(Envio.idEnvio)).scalar() or 0,
    }

    return {
        "metricas": metricas,
        "pedidos": [pedido_admin_response(pedido, cliente_row, db) for pedido, cliente_row in filas],
    }


@router.get("/admin/{pedido_id}")
def obtener_pedido_admin(
    pedido_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(ROLES_PEDIDOS)),
):
    resultado = (
        db.query(Pedido, Cliente)
        .join(Cliente, Pedido.Cliente_idCliente == Cliente.idCliente)
        .filter(Pedido.idPedido == pedido_id)
        .first()
    )
    if not resultado:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    pedido, cliente = resultado
    return pedido_admin_response(pedido, cliente, db)


@router.post("/admin/{pedido_id}/cancelar")
def cancelar_pedido_admin(
    pedido_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(ROLES_PEDIDOS)),
):
    try:
        resultado = (
            db.query(Pedido, Cliente)
            .join(Cliente, Pedido.Cliente_idCliente == Cliente.idCliente)
            .filter(Pedido.idPedido == pedido_id)
            .with_for_update()
            .first()
        )
        if not resultado:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
        pedido, cliente = resultado
        cancelar_pedido_pendiente(pedido, db)
        db.commit()
        db.refresh(pedido)
        return {
            "mensaje": "Pedido cancelado y stock liberado",
            **pedido_admin_response(pedido, cliente, db),
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No fue posible cancelar el pedido") from exc


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
