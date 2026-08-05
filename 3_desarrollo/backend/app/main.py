
# ==============================
# IMPORTACIÓN DE LIBRERÍAS
# ==============================

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import sessionmaker, declarative_base
from pydantic import BaseModel
from passlib.context import CryptContext
from app.routes import auth_routes
from app.routes import cliente_routes
from app.routes import catalogo_routes
from app.routes import carrito_routes

# ==============================
# CREACIÓN DE LA APLICACIÓN
# ==============================

app = FastAPI(
    title="NeoGest API",
    description="API del sistema de gestión de muebles NeoGest",
    version="1.0"
)
# ==============================
# CONFIGURACIÓN DE CORS
# Permite conexión con React
# ==============================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción se restringe
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================
# CREAR TABLAS SI NO EXISTEN
# ==============================

app.include_router(auth_routes.router)
app.include_router(cliente_routes.router)
app.include_router(catalogo_routes.router)
app.include_router(carrito_routes.router)


@app.get("/")
def inicio():
    return {"mensaje": "API NeoGest funcionando correctamente"}
