import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.cliente import Cliente
from app.models.pago import Factura, Pago
from app.models.pedido import Pedido
from app.models.usuario import Usuario
from app.schemas.pago_schema import PagoCreate
from app.security.security import get_current_user

router = APIRouter(prefix="/api/v1/pagos", tags=["Pagos y Facturacion"])


def obtener_cliente_actual(current_user: Usuario, db: Session) -> Cliente:
    cliente = db.query(Cliente).filter(Cliente.Usuario_idUsuario == current_user.idUsuario).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="No existe un cliente asociado al usuario")
    return cliente


def limpiar_ruc_nit(valor: str) -> str:
    normalizado = valor.strip().upper()
    if not re.fullmatch(r"[0-9A-Z.-]{5,45}", normalizado):
        raise HTTPException(
            status_code=422,
            detail="El RUC/NIT solo debe contener letras, numeros, puntos o guiones",
        )
    return normalizado


def factura_response(factura: Factura | None):
    if not factura:
        return None
    return {
        "id": factura.idFactura,
        "numero_factura": factura.numero_factura,
        "ruc_nit_cliente": factura.ruc_nit_cliente,
        "url_pdf": factura.url_pdf,
        "fecha_emision": factura.fecha_emision.isoformat() if factura.fecha_emision else None,
    }


def pago_response(pago: Pago, pedido: Pedido, factura: Factura | None = None):
    return {
        "id": pago.idPago,
        "metodo": pago.metodo,
        "monto": float(pago.monto),
        "fecha_pago": pago.fecha_pago.isoformat() if pago.fecha_pago else None,
        "estado_transaccion": pago.estado_transaccion,
        "pedido_id": pago.Pedido_idPedido,
        "pedido_estado": pedido.estado,
        "factura": factura_response(factura),
    }


def obtener_pedido_del_cliente(pedido_id: int, cliente: Cliente, db: Session, bloquear: bool = False) -> Pedido:
    consulta = db.query(Pedido).filter(
        Pedido.idPedido == pedido_id,
        Pedido.Cliente_idCliente == cliente.idCliente,
    )
    if bloquear:
        consulta = consulta.with_for_update()
    pedido = consulta.first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return pedido


@router.post("", status_code=201)
def registrar_pago(
    data: PagoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    cliente = obtener_cliente_actual(current_user, db)
    ruc_nit = limpiar_ruc_nit(data.ruc_nit_cliente)

    try:
        pedido = obtener_pedido_del_cliente(data.pedido_id, cliente, db, bloquear=True)
        pago_aprobado = (
            db.query(Pago)
            .filter(
                Pago.Pedido_idPedido == pedido.idPedido,
                Pago.estado_transaccion == "Aprobado",
            )
            .first()
        )
        if pago_aprobado:
            raise HTTPException(status_code=409, detail="Este pedido ya tiene un pago aprobado")
        if pedido.estado != "Pendiente":
            raise HTTPException(status_code=409, detail=f"El pedido no puede pagarse en estado {pedido.estado}")

        pago = Pago(
            metodo=data.metodo.strip(),
            monto=pedido.total_compra,
            estado_transaccion=data.estado_transaccion,
            Pedido_idPedido=pedido.idPedido,
        )
        db.add(pago)
        db.flush()

        factura = None
        if data.estado_transaccion == "Aprobado":
            pedido.estado = "Pagado"
            factura = Factura(
                numero_factura=f"FAC-{datetime.utcnow():%Y%m%d}-{pedido.idPedido}-{pago.idPago}",
                ruc_nit_cliente=ruc_nit,
                url_pdf=None,
                Pedido_idPedido=pedido.idPedido,
            )
            db.add(factura)
            db.flush()

        db.commit()
        db.refresh(pago)
        db.refresh(pedido)
        if factura:
            db.refresh(factura)

        return pago_response(pago, pedido, factura)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No fue posible registrar el pago") from exc


@router.get("/mis-pagos")
def listar_mis_pagos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    cliente = obtener_cliente_actual(current_user, db)
    filas = (
        db.query(Pago, Pedido)
        .join(Pedido, Pago.Pedido_idPedido == Pedido.idPedido)
        .filter(Pedido.Cliente_idCliente == cliente.idCliente)
        .order_by(Pago.idPago.desc())
        .all()
    )
    respuesta = []
    for pago, pedido in filas:
        factura = db.query(Factura).filter(Factura.Pedido_idPedido == pedido.idPedido).first()
        respuesta.append(pago_response(pago, pedido, factura))
    return respuesta


@router.get("/pedido/{pedido_id}")
def obtener_pago_de_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    cliente = obtener_cliente_actual(current_user, db)
    pedido = obtener_pedido_del_cliente(pedido_id, cliente, db)
    pago = (
        db.query(Pago)
        .filter(Pago.Pedido_idPedido == pedido.idPedido)
        .order_by(Pago.idPago.desc())
        .first()
    )
    if not pago:
        raise HTTPException(status_code=404, detail="El pedido no tiene pagos registrados")
    factura = db.query(Factura).filter(Factura.Pedido_idPedido == pedido.idPedido).first()
    return pago_response(pago, pedido, factura)
