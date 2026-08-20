from datetime import datetime, timedelta, timezone
from typing import Iterable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import ACCESS_TOKEN_EXPIRE_MINUTES, SECRET_KEY
from app.database import get_db
from app.models.usuario import Usuario

ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(usuario: Usuario):
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(usuario.idUsuario),
        "rol": usuario.Rol_idRol,
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales no validas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise credentials_exception

    usuario = db.query(Usuario).filter(Usuario.idUsuario == user_id).first()
    if not usuario or usuario.estado != 1:
        raise credentials_exception
    return usuario


def require_roles(roles: Iterable[int]):
    allowed_roles = set(roles)

    def dependency(current_user: Usuario = Depends(get_current_user)):
        if current_user.Rol_idRol not in allowed_roles:
            raise HTTPException(status_code=403, detail="No tiene permisos para realizar esta accion")
        return current_user

    return dependency


def ensure_same_user_or_admin(usuario_id: int, current_user: Usuario):
    if current_user.Rol_idRol == 1 or current_user.idUsuario == usuario_id:
        return
    raise HTTPException(status_code=403, detail="No tiene permisos para acceder a este recurso")
