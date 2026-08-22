import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routes import auth_routes
from app.routes import carrito_routes
from app.routes import catalogo_routes
from app.routes import cliente_routes
from app.routes import dashboard_routes
from app.routes import devolucion_routes
from app.routes import empleado_routes
from app.routes import envio_routes
from app.routes import inventario_routes
from app.routes import pago_routes
from app.routes import pedido_routes
from app.services.pedido_expiration_worker import monitor_pedidos_pendientes


@asynccontextmanager
async def lifespan(app: FastAPI):
    expiration_task = asyncio.create_task(monitor_pedidos_pendientes())
    app.state.pending_order_expiration_task = expiration_task
    try:
        yield
    finally:
        expiration_task.cancel()
        with suppress(asyncio.CancelledError):
            await expiration_task


app = FastAPI(
    title="NeoGest API",
    description="API del sistema de gestion de muebles NeoGest",
    version="1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(auth_routes.router)
app.include_router(cliente_routes.router)
app.include_router(dashboard_routes.router)
app.include_router(catalogo_routes.router)
app.include_router(carrito_routes.router)
app.include_router(empleado_routes.router)
app.include_router(pedido_routes.router)
app.include_router(pago_routes.router)
app.include_router(envio_routes.router)
app.include_router(inventario_routes.router)
app.include_router(devolucion_routes.router)


@app.get("/")
def inicio():
    return {"mensaje": "API NeoGest funcionando correctamente"}
