from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.empleado import Empleado
from app.models.usuario import Usuario


def obtener_empleado_actual(current_user: Usuario, db: Session) -> Empleado:
    empleado = (
        db.query(Empleado)
        .filter(Empleado.Usuario_idUsuario == current_user.idUsuario)
        .first()
    )
    if empleado:
        return empleado

    if current_user.Rol_idRol == 1:
        empleado = Empleado(
            nombre_empleado=current_user.email,
            cargo="Administrador Master",
            id_jefe_master=None,
            Usuario_idUsuario=current_user.idUsuario,
        )
        db.add(empleado)
        db.flush()
        return empleado

    raise HTTPException(status_code=403, detail="El usuario no esta registrado como empleado")
