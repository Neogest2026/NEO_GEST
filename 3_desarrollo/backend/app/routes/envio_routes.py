from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.catalogo import Producto
from app.models.cliente import Cliente
from app.models.empleado import Empleado
from app.models.envio import Envio
from app.models.pedido import DetallePedido, Pedido
from app.models.usuario import Usuario
from app.schemas.envio_schema import ESTADO_EN_RUTA, EnvioCreate, EnvioResponse, EnvioUpdate
from app.security.security import get_current_user, require_roles
from app.services.empleado_context import obtener_empleado_actual

router = APIRouter(prefix="/api/v1/envios", tags=["Envios y Tracking"])

ROLES_LOGISTICA = [1, 2]


def decimal_to_float(value):
    return float(value or 0)


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


def envio_response(envio: Envio, db: Session | None = None) -> dict:
    response = {
        "id": envio.idEnvio,
        "empresa_transporte": envio.empresa_transporte,
        "codigo_seguimiento": envio.codigo_seguimiento,
        "fecha_despacho": envio.fecha_despacho.isoformat() if envio.fecha_despacho else None,
        "fecha_entrega_estimada": envio.fecha_entrega_estimada.isoformat() if envio.fecha_entrega_estimada else None,
        "estado": envio.estado,
        "pedido_id": envio.Pedido_idPedido,
        "empleado_id": envio.Empleado_idEmpleado,
    }
    if db is not None:
        pedido_cliente = (
            db.query(Pedido, Cliente)
            .join(Cliente, Pedido.Cliente_idCliente == Cliente.idCliente)
            .filter(Pedido.idPedido == envio.Pedido_idPedido)
            .first()
        )
        if pedido_cliente:
            pedido, cliente = pedido_cliente
            items = obtener_items_pedido(pedido.idPedido, db)
            response["cliente_nombre"] = cliente.nombre_completo
            response["cliente_telefono"] = cliente.telefono
            response["cliente_direccion"] = cliente.direccion_envio
            response["pedido_estado"] = pedido.estado
            response["pedido_total"] = decimal_to_float(pedido.total_compra)
            response["productos"] = ", ".join(item["producto"]["nombre"] for item in items)
            response["items_count"] = sum(item["cantidad"] for item in items)
            response["items"] = items
        empleado = db.query(Empleado).filter(Empleado.idEmpleado == envio.Empleado_idEmpleado).first()
        if empleado:
            response["empleado_nombre"] = empleado.nombre_empleado
    return response


def serialize_datetime(valor):
    return valor.isoformat() if valor else None


@router.post("", response_model=EnvioResponse, status_code=201)
def crear_envio(
    data: EnvioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(ROLES_LOGISTICA)),
):
    empleado = obtener_empleado_actual(current_user, db)
    pedido = db.query(Pedido).filter(Pedido.idPedido == data.pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="El pedido no existe")

    try:
        if pedido.estado != "Pagado":
            raise HTTPException(
                status_code=409,
                detail=f"Solo se pueden despachar pedidos pagados. Estado actual: {pedido.estado}",
            )

        envio_existente = (
            db.query(Envio).filter(Envio.Pedido_idPedido == pedido.idPedido).first()
        )
        if envio_existente:
            raise HTTPException(
                status_code=409,
                detail="El pedido ya tiene un envio registrado",
            )

        envio = Envio(
            empresa_transporte=data.empresa_transporte.strip(),
            codigo_seguimiento=data.codigo_seguimiento.strip(),
            fecha_despacho=data.fecha_despacho or datetime.utcnow(),
            fecha_entrega_estimada=data.fecha_entrega_estimada,
            estado=ESTADO_EN_RUTA,
            Pedido_idPedido=pedido.idPedido,
            Empleado_idEmpleado=empleado.idEmpleado,
        )
        db.add(envio)
        db.commit()
        db.refresh(envio)
        return envio_response(envio, db)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No fue posible registrar el envio") from exc


@router.get("/pedidos", tags=["Envios y Tracking"])
def listar_pedidos_para_envio(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(ROLES_LOGISTICA)),
):
    filas = (
        db.query(Pedido, Cliente)
        .join(Cliente, Pedido.Cliente_idCliente == Cliente.idCliente)
        .filter(Pedido.estado == "Pagado")
        .order_by(Pedido.idPedido.desc())
        .all()
    )
    respuesta = []
    for pedido, cliente in filas:
        tiene_envio = (
            db.query(Envio).filter(Envio.Pedido_idPedido == pedido.idPedido).first()
        )
        items = obtener_items_pedido(pedido.idPedido, db)
        respuesta.append({
            "id": pedido.idPedido,
            "cliente_nombre": cliente.nombre_completo,
            "cliente_telefono": cliente.telefono,
            "cliente_direccion": cliente.direccion_envio,
            "total_compra": float(pedido.total_compra),
            "fecha_creacion": serialize_datetime(pedido.fecha_creacion),
            "productos": ", ".join(item["producto"]["nombre"] for item in items),
            "items_count": sum(item["cantidad"] for item in items),
            "items": items,
            "ya_tiene_envio": bool(tiene_envio),
        })
    return respuesta


@router.get("", response_model=list[EnvioResponse])
def listar_envios(
    pedido_id: int | None = Query(default=None, gt=0),
    estado: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(ROLES_LOGISTICA)),
):
    consulta = db.query(Envio)
    if pedido_id:
        consulta = consulta.filter(Envio.Pedido_idPedido == pedido_id)
    if estado:
        consulta = consulta.filter(Envio.estado == estado)
    envios = consulta.order_by(Envio.idEnvio.desc()).all()
    return [envio_response(envio, db) for envio in envios]


@router.get("/resumen")
def obtener_resumen_envios(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(ROLES_LOGISTICA)),
):
    pedidos_pagados = db.query(Pedido).filter(Pedido.estado == "Pagado").all()
    pendientes_despacho = 0
    for pedido in pedidos_pagados:
        tiene_envio = db.query(Envio).filter(Envio.Pedido_idPedido == pedido.idPedido).first()
        if not tiene_envio:
            pendientes_despacho += 1

    envios = db.query(Envio).order_by(Envio.idEnvio.desc()).limit(200).all()
    return {
        "metricas": {
            "total_envios": db.query(func.count(Envio.idEnvio)).scalar() or 0,
            "pendientes_despacho": pendientes_despacho,
            "en_ruta": db.query(func.count(Envio.idEnvio)).filter(Envio.estado == "En ruta").scalar() or 0,
            "entregados": db.query(func.count(Envio.idEnvio)).filter(Envio.estado == "Entregado").scalar() or 0,
            "cancelados": db.query(func.count(Envio.idEnvio)).filter(Envio.estado == "Cancelado").scalar() or 0,
        },
        "envios": [envio_response(envio, db) for envio in envios],
    }


@router.get("/{envio_id}", response_model=EnvioResponse)
def obtener_envio(
    envio_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(ROLES_LOGISTICA)),
):
    envio = db.query(Envio).filter(Envio.idEnvio == envio_id).first()
    if not envio:
        raise HTTPException(status_code=404, detail="Envio no encontrado")
    return envio_response(envio, db)


@router.patch("/{envio_id}", response_model=EnvioResponse)
def actualizar_envio(
    envio_id: int,
    data: EnvioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(ROLES_LOGISTICA)),
):
    obtener_empleado_actual(current_user, db)
    envio = db.query(Envio).filter(Envio.idEnvio == envio_id).first()
    if not envio:
        raise HTTPException(status_code=404, detail="Envio no encontrado")

    try:
        if data.empresa_transporte is not None:
            envio.empresa_transporte = data.empresa_transporte.strip()
        if data.codigo_seguimiento is not None:
            envio.codigo_seguimiento = data.codigo_seguimiento.strip()
        if data.estado is not None:
            envio.estado = data.estado.strip()
        if data.fecha_despacho is not None:
            envio.fecha_despacho = data.fecha_despacho
        if data.fecha_entrega_estimada is not None:
            envio.fecha_entrega_estimada = data.fecha_entrega_estimada

        pedido = db.query(Pedido).filter(Pedido.idPedido == envio.Pedido_idPedido).first()
        if pedido and envio.estado == "Entregado":
            pedido.estado = "Entregado"

        db.commit()
        db.refresh(envio)
        return envio_response(envio, db)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No fue posible actualizar el envio") from exc


@router.get("/seguimiento/pedido/{pedido_id}")
def rastrear_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    pedido = db.query(Pedido).filter(Pedido.idPedido == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    if current_user.Rol_idRol == 3:
        cliente = (
            db.query(Cliente)
            .filter(Cliente.Usuario_idUsuario == current_user.idUsuario)
            .first()
        )
        if not cliente or pedido.Cliente_idCliente != cliente.idCliente:
            raise HTTPException(status_code=403, detail="No tiene permisos para rastrear este pedido")

    envio = db.query(Envio).filter(Envio.Pedido_idPedido == pedido.idPedido).first()
    if not envio:
        return {
            "pedido_id": pedido.idPedido,
            "estado_pedido": pedido.estado,
            "tiene_envio": False,
            "mensaje": "El pedido aun no ha sido despachado",
        }

    return {
        "pedido_id": envio.Pedido_idPedido,
        "estado_pedido": pedido.estado,
        "tiene_envio": True,
        "empresa_transporte": envio.empresa_transporte,
        "codigo_seguimiento": envio.codigo_seguimiento,
        "estado": envio.estado,
        "fecha_despacho": serialize_datetime(envio.fecha_despacho),
        "fecha_entrega_estimada": serialize_datetime(envio.fecha_entrega_estimada),
    }
