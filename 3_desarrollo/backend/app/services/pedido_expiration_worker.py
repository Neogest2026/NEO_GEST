import asyncio
import logging

from app.config import PENDING_ORDER_EXPIRATION_CHECK_SECONDS, PENDING_ORDER_EXPIRATION_MINUTES
from app.database import SessionLocal
from app.services.pedido_service import expirar_todos_los_pedidos_pendientes

logger = logging.getLogger(__name__)


async def monitor_pedidos_pendientes():
    if PENDING_ORDER_EXPIRATION_MINUTES <= 0 or PENDING_ORDER_EXPIRATION_CHECK_SECONDS <= 0:
        return

    while True:
        await asyncio.sleep(PENDING_ORDER_EXPIRATION_CHECK_SECONDS)
        db = SessionLocal()
        try:
            expirados = expirar_todos_los_pedidos_pendientes(db)
            if expirados:
                db.commit()
                logger.info("Pedidos pendientes vencidos: %s", expirados)
        except Exception:
            db.rollback()
            logger.exception("No fue posible vencer pedidos pendientes")
        finally:
            db.close()
