from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.cliente import Cliente
from app.models.devolucion import Devolucion
from app.models.empleado import Empleado
from app.models.pedido import Pedido
from app.models.usuario import Usuario
from app.schemas.devolucion_schema import DevolucionCreate, DevolucionDecision, DevolucionResponse
from app.security.security import require_roles
from app.services.empleado_context import obtener_empleado_actual

router = APIRouter(prefix="/api/v1/devoluciones", tags=["Devoluciones"])

ROLES_DEVOLUCION = [1, 2]


def devolucion_response(
    devolucion: Devolucion,
    pedido: Pedido | None = None,
    cliente: Cliente | None = None,
    empleado: Empleado | None = None,
):
    return {
        "id": devolucion.idDevolucion,
        "fecha_solicitud": devolucion.fecha_solicitud,
        "motivo": devolucion.motivo,
        "estado": devolucion.estado,
        "monto_reembolso": float(devolucion.monto_reembolso or 0),
        "pedido_id": devolucion.Pedido_idPedido,
        "pedido_total": float(pedido.total_compra) if pedido else None,
        "cliente_nombre": cliente.nombre_completo if cliente else None,
        "empleado_id": devolucion.Empleado_idEmpleado,
        "empleado_nombre": empleado.nombre_empleado if empleado else None,
    }


def query_devoluciones(db: Session):
    return (
        db.query(Devolucion, Pedido, Cliente, Empleado)
        .join(Pedido, Devolucion.Pedido_idPedido == Pedido.idPedido)
        .join(Cliente, Pedido.Cliente_idCliente == Cliente.idCliente)
        .join(Empleado, Devolucion.Empleado_idEmpleado == Empleado.idEmpleado)
    )


@router.get("/pedidos")
def listar_pedidos_para_devolucion(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(ROLES_DEVOLUCION)),
):
    filas = (
        db.query(Pedido, Cliente)
        .join(Cliente, Pedido.Cliente_idCliente == Cliente.idCliente)
        .filter(Pedido.estado == "Pagado")
        .order_by(Pedido.idPedido.desc())
        .limit(100)
        .all()
    )
    return [
        {
            "id": pedido.idPedido,
            "cliente_nombre": cliente.nombre_completo,
            "total_compra": float(pedido.total_compra),
            "fecha_creacion": pedido.fecha_creacion,
        }
        for pedido, cliente in filas
    ]


@router.post("", response_model=DevolucionResponse, status_code=201)
def crear_devolucion(
    data: DevolucionCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(ROLES_DEVOLUCION)),
):
    empleado = obtener_empleado_actual(current_user, db)
    try:
        resultado = (
            db.query(Pedido, Cliente)
            .join(Cliente, Pedido.Cliente_idCliente == Cliente.idCliente)
            .filter(Pedido.idPedido == data.pedido_id)
            .first()
        )
        if not resultado:
            raise HTTPException(status_code=404, detail="Pedido no encontrado")
        pedido, cliente = resultado
        if pedido.estado != "Pagado":
            raise HTTPException(status_code=409, detail="Solo se pueden solicitar devoluciones de pedidos pagados")

        devolucion_abierta = (
            db.query(Devolucion)
            .filter(
                Devolucion.Pedido_idPedido == pedido.idPedido,
                Devolucion.estado == "Solicitada",
            )
            .first()
        )
        if devolucion_abierta:
            raise HTTPException(status_code=409, detail="El pedido ya tiene una devolucion solicitada")

        devolucion = Devolucion(
            motivo=data.motivo.strip(),
            estado="Solicitada",
            monto_reembolso=0,
            Pedido_idPedido=pedido.idPedido,
            Empleado_idEmpleado=empleado.idEmpleado,
        )
        db.add(devolucion)
        db.commit()
        db.refresh(devolucion)
        return devolucion_response(devolucion, pedido, cliente, empleado)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No fue posible crear la devolucion") from exc


@router.get("", response_model=list[DevolucionResponse])
def listar_devoluciones(
    estado: str | None = Query(default="Solicitada"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(ROLES_DEVOLUCION)),
):
    consulta = query_devoluciones(db)
    if estado:
        consulta = consulta.filter(Devolucion.estado == estado)
    filas = consulta.order_by(Devolucion.idDevolucion.desc()).limit(100).all()
    return [
        devolucion_response(devolucion, pedido, cliente, empleado)
        for devolucion, pedido, cliente, empleado in filas
    ]


@router.patch("/{devolucion_id}", response_model=DevolucionResponse)
def decidir_devolucion(
    devolucion_id: int,
    data: DevolucionDecision,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(ROLES_DEVOLUCION)),
):
    empleado = obtener_empleado_actual(current_user, db)
    try:
        fila = (
            query_devoluciones(db)
            .filter(Devolucion.idDevolucion == devolucion_id)
            .with_for_update()
            .first()
        )
        if not fila:
            raise HTTPException(status_code=404, detail="Devolucion no encontrada")
        devolucion, pedido, cliente, _empleado_original = fila

        if devolucion.estado != "Solicitada":
            raise HTTPException(status_code=409, detail="La devolucion ya fue gestionada")

        if data.estado == "Aprobada":
            if data.monto_reembolso is None or data.monto_reembolso <= 0:
                raise HTTPException(status_code=422, detail="El monto de reembolso es obligatorio al aprobar")
            if data.monto_reembolso > float(pedido.total_compra):
                raise HTTPException(status_code=409, detail="El reembolso no puede superar el total del pedido")
            devolucion.monto_reembolso = data.monto_reembolso
        else:
            devolucion.monto_reembolso = 0

        devolucion.estado = data.estado
        devolucion.Empleado_idEmpleado = empleado.idEmpleado
        db.commit()
        db.refresh(devolucion)
        return devolucion_response(devolucion, pedido, cliente, empleado)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No fue posible gestionar la devolucion") from exc
