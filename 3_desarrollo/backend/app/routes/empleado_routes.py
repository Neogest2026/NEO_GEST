from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.empleado import Empleado
from app.models.usuario import Usuario
from app.schemas.empleado_schema import EmpleadoCreate
from app.security.security import hash_password, require_roles

router = APIRouter(prefix="/api/v1/empleados", tags=["Empleados"])


def empleado_response(empleado: Empleado, usuario: Usuario):
    return {
        "id": empleado.idEmpleado,
        "nombre_empleado": empleado.nombre_empleado,
        "cargo": empleado.cargo,
        "id_jefe_master": empleado.id_jefe_master,
        "usuario": {
            "id": usuario.idUsuario,
            "email": usuario.email,
            "estado": usuario.estado,
            "rol": usuario.Rol_idRol,
        },
    }


@router.get("")
def listar_empleados(
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_roles([1])),
):
    filas = (
        db.query(Empleado, Usuario)
        .join(Usuario, Empleado.Usuario_idUsuario == Usuario.idUsuario)
        .order_by(Empleado.idEmpleado.desc())
        .all()
    )
    return [empleado_response(empleado, usuario) for empleado, usuario in filas]


@router.post("", status_code=201)
def crear_empleado(
    data: EmpleadoCreate,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_roles([1])),
):
    if "@" not in data.email or "." not in data.email.split("@")[-1]:
        raise HTTPException(status_code=422, detail="Correo electronico invalido")

    usuario_existente = db.query(Usuario).filter(Usuario.email == data.email).first()
    if usuario_existente:
        raise HTTPException(status_code=400, detail="El correo ya esta registrado")

    try:
        nuevo_usuario = Usuario(
            email=data.email,
            password_hash=hash_password(data.password),
            Rol_idRol=2,
            estado=1,
        )
        db.add(nuevo_usuario)
        db.flush()

        nuevo_empleado = Empleado(
            nombre_empleado=data.nombre_empleado,
            cargo=data.cargo,
            id_jefe_master=admin.idUsuario,
            Usuario_idUsuario=nuevo_usuario.idUsuario,
        )
        db.add(nuevo_empleado)
        db.commit()
        db.refresh(nuevo_empleado)
        db.refresh(nuevo_usuario)

        return empleado_response(nuevo_empleado, nuevo_usuario)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No fue posible crear el empleado") from exc
