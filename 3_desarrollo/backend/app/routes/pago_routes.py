import re
import smtplib
from datetime import datetime
from decimal import Decimal
from email.message import EmailMessage
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy.orm import Session

from app.config import (
    COMPANY_ADDRESS,
    COMPANY_EMAIL,
    COMPANY_NAME,
    COMPANY_NIT,
    COMPANY_PHONE,
    INVOICE_PREFIX,
    INVOICE_RESOLUTION,
    SMTP_FROM,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USE_TLS,
    SMTP_USER,
)
from app.database import get_db
from app.models.catalogo import Producto
from app.models.cliente import Cliente
from app.models.pago import Factura, Pago
from app.models.pedido import DetallePedido, Pedido
from app.models.usuario import Usuario
from app.schemas.pago_schema import EnvioComprobanteRequest, PagoCreate
from app.services.pedido_service import expirar_pedidos_pendientes
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


def validar_email(valor: str) -> str:
    email = valor.strip()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(status_code=422, detail="Correo de envio invalido")
    return email


def generar_numero_factura(factura_id: int, fecha: datetime | None) -> str:
    fecha_base = fecha or datetime.utcnow()
    return f"{INVOICE_PREFIX}-{fecha_base:%Y}-{factura_id:06d}"


def moneda(valor) -> str:
    monto = Decimal(valor or 0)
    return f"$ {monto:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")


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


def obtener_factura_del_cliente(factura_id: int, cliente: Cliente, db: Session):
    resultado = (
        db.query(Factura, Pedido, Pago)
        .join(Pedido, Factura.Pedido_idPedido == Pedido.idPedido)
        .join(Pago, Pago.Pedido_idPedido == Pedido.idPedido)
        .filter(
            Factura.idFactura == factura_id,
            Pedido.Cliente_idCliente == cliente.idCliente,
            Pago.estado_transaccion == "Aprobado",
        )
        .first()
    )
    if not resultado:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return resultado


def detalle_factura(pedido: Pedido, db: Session):
    return (
        db.query(DetallePedido, Producto)
        .join(Producto, DetallePedido.Producto_idProducto == Producto.idProducto)
        .filter(DetallePedido.Pedido_idPedido == pedido.idPedido)
        .all()
    )


def factura_response(factura: Factura | None, cliente: Cliente | None = None):
    if not factura:
        return None
    return {
        "id": factura.idFactura,
        "numero_factura": factura.numero_factura,
        "ruc_nit_cliente": factura.ruc_nit_cliente,
        "url_pdf": factura.url_pdf or f"/api/v1/pagos/facturas/{factura.idFactura}/pdf",
        "fecha_emision": factura.fecha_emision.isoformat() if factura.fecha_emision else None,
        "cliente_nombre": cliente.nombre_completo if cliente else None,
        "cliente_direccion": cliente.direccion_facturacion if cliente else None,
        "empresa_nombre": COMPANY_NAME,
        "empresa_nit": COMPANY_NIT,
    }


def pago_response(pago: Pago, pedido: Pedido, factura: Factura | None = None, cliente: Cliente | None = None):
    return {
        "id": pago.idPago,
        "metodo": pago.metodo,
        "monto": float(pago.monto),
        "fecha_pago": pago.fecha_pago.isoformat() if pago.fecha_pago else None,
        "estado_transaccion": pago.estado_transaccion,
        "pedido_id": pago.Pedido_idPedido,
        "pedido_estado": pedido.estado,
        "factura": factura_response(factura, cliente),
    }


def generar_pdf_factura(factura: Factura, pedido: Pedido, pago: Pago, cliente: Cliente, db: Session) -> bytes:
    buffer = BytesIO()
    documento = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=42,
        leftMargin=42,
        topMargin=42,
        bottomMargin=42,
    )
    styles = getSampleStyleSheet()
    elementos = []

    elementos.append(Paragraph(f"{COMPANY_NAME} - Factura de venta", styles["Title"]))
    elementos.append(Spacer(1, 12))

    encabezado = [
        ["Factura", factura.numero_factura],
        ["Fecha emision", factura.fecha_emision.strftime("%Y-%m-%d %H:%M") if factura.fecha_emision else ""],
        ["Resolucion", INVOICE_RESOLUTION],
        ["Pedido", f"#{pedido.idPedido}"],
        ["Estado pedido", pedido.estado],
    ]
    empresa_cliente = [
        ["Emisor", COMPANY_NAME],
        ["NIT emisor", COMPANY_NIT],
        ["Direccion emisor", COMPANY_ADDRESS],
        ["Contacto emisor", f"{COMPANY_EMAIL} / {COMPANY_PHONE}"],
        ["Cliente", cliente.nombre_completo],
        ["RUC/NIT cliente", factura.ruc_nit_cliente],
        ["Direccion facturacion", cliente.direccion_facturacion],
        ["Telefono cliente", cliente.telefono],
    ]

    for tabla_datos in (encabezado, empresa_cliente):
        tabla = Table(tabla_datos, colWidths=[145, 350])
        tabla.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F3F4F6")),
            ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#111827")),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D1D5DB")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("PADDING", (0, 0), (-1, -1), 7),
        ]))
        elementos.append(tabla)
        elementos.append(Spacer(1, 14))

    filas_items = [["Producto", "Cant.", "Precio unit.", "Total"]]
    for detalle, producto in detalle_factura(pedido, db):
        total_item = Decimal(detalle.precio_al_momento) * detalle.cantidad
        filas_items.append([
            producto.nombre,
            str(detalle.cantidad),
            moneda(detalle.precio_al_momento),
            moneda(total_item),
        ])

    tabla_items = Table(filas_items, colWidths=[245, 60, 95, 95])
    tabla_items.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D1D5DB")),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
        ("PADDING", (0, 0), (-1, -1), 7),
    ]))
    elementos.append(tabla_items)
    elementos.append(Spacer(1, 14))

    totales = [
        ["Metodo de pago", pago.metodo],
        ["Estado transaccion", pago.estado_transaccion],
        ["Total facturado", moneda(pago.monto)],
    ]
    tabla_totales = Table(totales, colWidths=[145, 350])
    tabla_totales.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F3F4F6")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D1D5DB")),
        ("PADDING", (0, 0), (-1, -1), 7),
    ]))
    elementos.append(tabla_totales)
    elementos.append(Spacer(1, 16))
    elementos.append(Paragraph("Documento generado automaticamente por NeoGest.", styles["Normal"]))

    documento.build(elementos)
    buffer.seek(0)
    return buffer.getvalue()


def enviar_factura_por_smtp(destinatario: str, factura: Factura, pedido: Pedido, pago: Pago, cliente: Cliente, pdf: bytes):
    if not SMTP_HOST:
        return {
            "enviado": False,
            "modo": "simulado",
            "destinatario": destinatario,
            "mensaje": "SMTP no configurado; comprobante preparado pero no enviado realmente",
        }

    mensaje = EmailMessage()
    mensaje["Subject"] = f"Factura {factura.numero_factura} - NeoGest"
    mensaje["From"] = SMTP_FROM
    mensaje["To"] = destinatario
    mensaje.set_content(
        "\n".join([
            f"Hola {cliente.nombre_completo},",
            "",
            f"Adjuntamos la factura {factura.numero_factura} del pedido #{pedido.idPedido}.",
            f"Total: {moneda(pago.monto)}",
            "",
            "Gracias por comprar en NeoGest.",
        ])
    )
    mensaje.add_attachment(
        pdf,
        maintype="application",
        subtype="pdf",
        filename=f"{factura.numero_factura}.pdf",
    )

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as smtp:
        if SMTP_USE_TLS:
            smtp.starttls()
        if SMTP_USER:
            smtp.login(SMTP_USER, SMTP_PASSWORD)
        smtp.send_message(mensaje)

    return {
        "enviado": True,
        "modo": "smtp",
        "destinatario": destinatario,
        "mensaje": "Comprobante enviado correctamente",
    }


@router.post("", status_code=201)
def registrar_pago(
    data: PagoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    cliente = obtener_cliente_actual(current_user, db)
    ruc_nit = limpiar_ruc_nit(data.ruc_nit_cliente)

    try:
        if expirar_pedidos_pendientes(cliente.idCliente, db):
            db.commit()
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
                numero_factura=f"TMP-{pedido.idPedido}-{pago.idPago}",
                ruc_nit_cliente=ruc_nit,
                url_pdf=None,
                Pedido_idPedido=pedido.idPedido,
            )
            db.add(factura)
            db.flush()
            factura.numero_factura = generar_numero_factura(factura.idFactura, factura.fecha_emision)
            factura.url_pdf = f"/api/v1/pagos/facturas/{factura.idFactura}/pdf"

        db.commit()
        db.refresh(pago)
        db.refresh(pedido)
        if factura:
            db.refresh(factura)

        return pago_response(pago, pedido, factura, cliente)
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
        respuesta.append(pago_response(pago, pedido, factura, cliente))
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
    return pago_response(pago, pedido, factura, cliente)


@router.get("/facturas/{factura_id}/pdf")
def descargar_factura_pdf(
    factura_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    cliente = obtener_cliente_actual(current_user, db)
    factura, pedido, pago = obtener_factura_del_cliente(factura_id, cliente, db)
    pdf = generar_pdf_factura(factura, pedido, pago, cliente, db)
    return StreamingResponse(
        BytesIO(pdf),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{factura.numero_factura}.pdf"'},
    )


@router.post("/facturas/{factura_id}/email")
def enviar_factura_email(
    factura_id: int,
    data: EnvioComprobanteRequest | None = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    cliente = obtener_cliente_actual(current_user, db)
    factura, pedido, pago = obtener_factura_del_cliente(factura_id, cliente, db)
    destinatario = validar_email(data.email_destino if data and data.email_destino else current_user.email)
    pdf = generar_pdf_factura(factura, pedido, pago, cliente, db)
    try:
        return enviar_factura_por_smtp(destinatario, factura, pedido, pago, cliente, pdf)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="No fue posible enviar el comprobante por correo") from exc
