from fastapi import APIRouter, HTTPException

from app.database import SessionLocal
from app.models.usuario import Usuario
from app.schemas.usuario_schema import LoginRequest, UsuarioRegistro
from app.security.security import create_access_token, hash_password, verify_password

router = APIRouter()


def validar_email(email: str):
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=422, detail="Correo electronico invalido")


@router.post("/register")
def registrar_usuario(usuario: UsuarioRegistro):
    validar_email(usuario.email)
    if len(usuario.password) < 6:
        raise HTTPException(status_code=422, detail="La contrasena debe tener minimo 6 caracteres")

    db = SessionLocal()
    try:
        usuario_existente = db.query(Usuario).filter(Usuario.email == usuario.email).first()
        if usuario_existente:
            raise HTTPException(status_code=400, detail="El correo ya esta registrado")

        nuevo_usuario = Usuario(
            email=usuario.email,
            password_hash=hash_password(usuario.password),
            Rol_idRol=usuario.rol,
            estado=1,
        )

        db.add(nuevo_usuario)
        db.commit()
        db.refresh(nuevo_usuario)

        return {
            "mensaje": "Usuario registrado",
            "idUsuario": nuevo_usuario.idUsuario,
        }
    finally:
        db.close()


@router.post("/login")
def login(request: LoginRequest):
    db = SessionLocal()
    try:
        usuario = db.query(Usuario).filter(Usuario.email == request.email).first()
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        if not verify_password(request.password, usuario.password_hash):
            raise HTTPException(status_code=401, detail="Contrasena incorrecta")

        access_token = create_access_token(usuario)
        return {
            "mensaje": "Login exitoso",
            "idUsuario": usuario.idUsuario,
            "rol": usuario.Rol_idRol,
            "access_token": access_token,
            "token_type": "bearer",
        }
    finally:
        db.close()
