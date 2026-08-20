from fastapi import APIRouter, HTTPException

from app.database import SessionLocal
from app.models.cliente import Cliente
from app.models.usuario import Usuario
from app.schemas.cliente_schema import ClienteRegistro, RegistroCliente
from app.security.security import hash_password

router = APIRouter()


def validar_registro_cliente(data: RegistroCliente):
    if "@" not in data.email or "." not in data.email.split("@")[-1]:
        raise HTTPException(status_code=422, detail="Correo electronico invalido")
    if len(data.password) < 6:
        raise HTTPException(status_code=422, detail="La contrasena debe tener minimo 6 caracteres")
    if len(data.nombre_completo.strip()) < 3:
        raise HTTPException(status_code=422, detail="El nombre debe tener minimo 3 caracteres")
    if not data.telefono.isdigit():
        raise HTTPException(status_code=422, detail="El telefono solo debe contener numeros")


@router.post("/clientes")
def crear_cliente(cliente: ClienteRegistro):
    db = SessionLocal()
    try:
        nuevo_cliente = Cliente(
            nombre_completo=cliente.nombre_completo,
            telefono=cliente.telefono,
            direccion_envio=cliente.direccion_envio,
            direccion_facturacion=cliente.direccion_facturacion,
            codigo_postal=cliente.codigo_postal,
            Usuario_idUsuario=cliente.usuario_id,
        )

        db.add(nuevo_cliente)
        db.commit()

        return {"mensaje": "Cliente creado correctamente"}
    finally:
        db.close()


@router.post("/registro-cliente")
def registro_cliente(data: RegistroCliente):
    validar_registro_cliente(data)
    db = SessionLocal()
    try:
        usuario_existente = db.query(Usuario).filter(Usuario.email == data.email).first()
        if usuario_existente:
            raise HTTPException(status_code=400, detail="El correo ya esta registrado")

        nuevo_usuario = Usuario(
            email=data.email,
            password_hash=hash_password(data.password),
            Rol_idRol=3,
            estado=1,
        )
        db.add(nuevo_usuario)
        db.flush()

        nuevo_cliente = Cliente(
            nombre_completo=data.nombre_completo,
            telefono=data.telefono,
            direccion_envio=data.direccion_envio,
            direccion_facturacion=data.direccion_facturacion,
            codigo_postal=data.codigo_postal,
            Usuario_idUsuario=nuevo_usuario.idUsuario,
        )
        db.add(nuevo_cliente)
        db.commit()
        db.refresh(nuevo_usuario)

        return {
            "mensaje": "Cliente registrado correctamente",
            "idUsuario": nuevo_usuario.idUsuario,
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No fue posible registrar el cliente") from exc
    finally:
        db.close()
