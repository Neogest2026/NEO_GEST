from decimal import Decimal
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.catalogo import Categoria, Producto
from app.models.empleado import Empleado
from app.models.inventario import MovimientoInventario
from app.models.usuario import Usuario
from app.schemas.inventario_schema import MovimientoInventarioCreate, MovimientoInventarioResponse
from app.security.security import require_roles
from app.services.empleado_context import obtener_empleado_actual

router = APIRouter(prefix="/api/v1/inventario", tags=["Inventario"])

ROLES_INVENTARIO = [1, 2]
TIPOS_ENTRADA = {"Entrada", "Devolucion"}
UPLOAD_DIR = Path("static/uploads/productos")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def decimal_to_float(value):
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def estado_stock(stock: int):
    if stock <= 0:
        return "Agotado"
    if stock <= 5:
        return "Bajo"
    return "Disponible"


def producto_inventario_response(producto: Producto, categoria: Categoria):
    precio = decimal_to_float(producto.precio_unitario)
    valor_stock = precio * producto.stock_actual
    return {
        "id": producto.idProducto,
        "nombre": producto.nombre,
        "descripcion": producto.descripcion,
        "categoria": categoria.nombre,
        "categoria_id": categoria.idCategoria,
        "precio_unitario": precio,
        "stock_actual": producto.stock_actual,
        "estado_stock": estado_stock(producto.stock_actual),
        "valor_stock": valor_stock,
        "dimensiones": producto.dimensiones,
        "peso": decimal_to_float(producto.peso) if producto.peso is not None else None,
        "imagen_url": producto.imagen_url,
        "activo": producto.activo,
        "ultimo_movimiento": None,
    }


async def guardar_imagen_producto(imagen: UploadFile | None):
    if not imagen or not imagen.filename:
        return None
    if imagen.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="La imagen debe ser JPG, PNG, WEBP o GIF")

    contenido = await imagen.read()
    if len(contenido) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="La imagen no puede superar 5 MB")

    extension = Path(imagen.filename).suffix.lower()
    if extension not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        raise HTTPException(status_code=415, detail="Extension de imagen no permitida")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    nombre_archivo = f"{uuid4().hex}{extension}"
    destino = UPLOAD_DIR / nombre_archivo
    destino.write_bytes(contenido)
    return f"/static/uploads/productos/{nombre_archivo}"


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
        "stock_anterior": movimiento.stock_anterior if movimiento.stock_anterior is not None else stock_anterior,
        "stock_nuevo": movimiento.stock_nuevo if movimiento.stock_nuevo is not None else producto.stock_actual,
    }


@router.get("/resumen")
def obtener_resumen_inventario(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(ROLES_INVENTARIO)),
):
    total_productos = db.query(func.count(Producto.idProducto)).filter(Producto.activo == True).scalar() or 0
    total_unidades = db.query(func.coalesce(func.sum(Producto.stock_actual), 0)).filter(Producto.activo == True).scalar() or 0
    productos_bajo_stock = (
        db.query(func.count(Producto.idProducto))
        .filter(Producto.activo == True, Producto.stock_actual > 0, Producto.stock_actual <= 5)
        .scalar()
        or 0
    )
    productos_agotados = (
        db.query(func.count(Producto.idProducto))
        .filter(Producto.activo == True, Producto.stock_actual == 0)
        .scalar()
        or 0
    )

    filas = (
        db.query(Producto, Categoria)
        .join(Categoria, Producto.Categoria_idCategoria == Categoria.idCategoria)
        .filter(Producto.activo == True)
        .order_by(Producto.nombre)
        .all()
    )

    productos = []
    valor_total = 0.0
    for producto, categoria in filas:
        precio = decimal_to_float(producto.precio_unitario)
        valor_stock = precio * producto.stock_actual
        valor_total += valor_stock
        ultimo_movimiento = (
            db.query(MovimientoInventario)
            .filter(MovimientoInventario.Producto_idProducto == producto.idProducto)
            .order_by(MovimientoInventario.idMovimiento_inventario.desc())
            .first()
        )
        productos.append({
            "id": producto.idProducto,
            "nombre": producto.nombre,
            "categoria": categoria.nombre,
            "precio_unitario": precio,
            "stock_actual": producto.stock_actual,
            "estado_stock": estado_stock(producto.stock_actual),
            "valor_stock": valor_stock,
            "imagen_url": producto.imagen_url,
            "activo": producto.activo,
            "ultimo_movimiento": (
                {
                    "id": ultimo_movimiento.idMovimiento_inventario,
                    "tipo": ultimo_movimiento.tipo,
                    "fecha": ultimo_movimiento.fecha,
                    "observacion": ultimo_movimiento.observacion,
                }
                if ultimo_movimiento
                else None
            ),
        })

    return {
        "metricas": {
            "total_productos": total_productos,
            "total_unidades": int(total_unidades),
            "productos_bajo_stock": productos_bajo_stock,
            "productos_agotados": productos_agotados,
            "valor_inventario": valor_total,
        },
        "productos": productos,
    }


@router.post("/productos", status_code=201)
async def crear_producto_inventario(
    nombre: str = Form(min_length=2, max_length=80),
    descripcion: str | None = Form(default=None, max_length=250),
    categoria_id: int = Form(gt=0),
    precio_unitario: Decimal = Form(gt=0),
    stock_actual: int = Form(ge=0),
    dimensiones: str | None = Form(default=None, max_length=45),
    peso: Decimal | None = Form(default=None, ge=0),
    imagen_url: str | None = Form(default=None, max_length=255),
    imagen: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(ROLES_INVENTARIO)),
):
    nombre_limpio = nombre.strip()
    descripcion_limpia = descripcion.strip() if descripcion else None
    dimensiones_limpias = dimensiones.strip() if dimensiones else None
    imagen_url_limpia = imagen_url.strip() if imagen_url else None

    categoria = db.query(Categoria).filter(Categoria.idCategoria == categoria_id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria no encontrada")

    existente = (
        db.query(Producto)
        .filter(func.lower(Producto.nombre) == nombre_limpio.lower(), Producto.activo == True)
        .first()
    )
    if existente:
        raise HTTPException(status_code=409, detail="Ya existe un producto con ese nombre")

    ruta_imagen = await guardar_imagen_producto(imagen)
    imagen_final = ruta_imagen or imagen_url_limpia
    if not imagen_final:
        raise HTTPException(status_code=422, detail="Debes subir una imagen o ingresar una URL de imagen")

    producto = Producto(
        nombre=nombre_limpio,
        descripcion=descripcion_limpia,
        precio_unitario=precio_unitario,
        stock_actual=stock_actual,
        dimensiones=dimensiones_limpias,
        peso=peso,
        imagen_url=imagen_final,
        activo=True,
        Categoria_idCategoria=categoria.idCategoria,
    )
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto_inventario_response(producto, categoria)


@router.delete("/productos/{producto_id}")
def eliminar_producto_inventario(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles(ROLES_INVENTARIO)),
):
    producto = db.query(Producto).filter(Producto.idProducto == producto_id).first()
    if not producto or not producto.activo:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    producto.activo = False
    db.commit()
    return {
        "mensaje": "Producto eliminado del catalogo activo",
        "id": producto.idProducto,
        "nombre": producto.nombre,
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
            .filter(Producto.idProducto == data.producto_id, Producto.activo == True)
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
            stock_anterior=stock_anterior,
            stock_nuevo=stock_nuevo,
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
