from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.catalogo import Producto
from app.models.empleado import Empleado
from app.models.inventario import MovimientoInventario
from app.models.usuario import Usuario
from app.schemas.inventario_schema import MovimientoInventarioCreate, MovimientoInventarioResponse
from app.security.security import require_roles
from app.services.empleado_context import obtener_empleado_actual

router = APIRouter(prefix="/api/v1/inventario", tags=["Inventario"])

ROLES_INVENTARIO = [1, 2]
TIPOS_ENTRADA = {"Entrada", "Devolución"}


def movimiento_response(
    movimiento: MovimientoInventario,
    producto: Producto,
    empleado: Empleado,
    stock_anterior: int | None = None,
):
    return {
        "id": movimiento.idMovimiento_inventario,
        "tipo": movimiento.tipo,
        "cantidad": movimiento.cantidad,
        "fecha": movimiento.fecha,
        "observacion": movimiento.observacion,
        "producto_id": producto.idProducto,
        "producto_nombre": producto.nombre,
        "empleado_id": empleado.idEmpleado,
        "empleado_nombre": empleado.nombre_empleado,
        "stock_anterior": stock_anterior,
        "stock_nuevo": producto.stock_actual,
    }


@router.post("/movimientos", response_model=MovimientoInventarioResponse, status_code=201)
def registrar_movimiento(
    data: MovimientoInventarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(ROLES_INVENTARIO)),
):
    empleado = obtener_empleado_actual(current_user, db)
    try:
        producto = (
            db.query(Producto)
            .filter(Producto.idProducto == data.producto_id)
            .with_for_update()
            .first()
        )
        if not producto:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

        stock_anterior = producto.stock_actual
        delta = data.cantidad if data.tipo in TIPOS_ENTRADA else -data.cantidad
        stock_nuevo = stock_anterior + delta
        if stock_nuevo < 0:
            raise HTTPException(status_code=409, detail="El movimiento dejaria el stock en negativo")

        producto.stock_actual = stock_nuevo
        movimiento = MovimientoInventario(
            tipo=data.tipo,
            cantidad=data.cantidad,
            observacion=data.observacion.strip() if data.observacion else None,
            Producto_idProducto=producto.idProducto,
            Empleado_idEmpleado=empleado.idEmpleado,
        )
        db.add(movimiento)
        db.commit()
        db.refresh(movimiento)
        db.refresh(producto)
        return movimiento_response(movimiento, producto, empleado, stock_anterior)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No fue posible registrar el movimiento") from exc


@router.get("/movimientos", response_model=list[MovimientoInventarioResponse])
def listar_movimientos(
    producto_id: int | None = Query(default=None, gt=0),
    tipo: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(ROLES_INVENTARIO)),
):
    consulta = (
        db.query(MovimientoInventario, Producto, Empleado)
        .join(Producto, MovimientoInventario.Producto_idProducto == Producto.idProducto)
        .join(Empleado, MovimientoInventario.Empleado_idEmpleado == Empleado.idEmpleado)
    )
    if producto_id:
        consulta = consulta.filter(MovimientoInventario.Producto_idProducto == producto_id)
    if tipo:
        consulta = consulta.filter(MovimientoInventario.tipo == tipo)

    filas = consulta.order_by(MovimientoInventario.idMovimiento_inventario.desc()).limit(100).all()
    return [
        movimiento_response(movimiento, producto, empleado)
        for movimiento, producto, empleado in filas
    ]
