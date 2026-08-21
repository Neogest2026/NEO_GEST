# Matriz de cierre HU-01 a HU-04

Fecha de actualizacion: 2026-08-20

Esta matriz deja trazabilidad de las cuatro historias ya trabajadas, los criterios cubiertos, las pruebas automatizadas y las capturas recomendadas para el manual.

## Comandos de verificacion

Con backend y frontend activos:

```powershell
cd C:\Users\jebus\OneDrive\Documentos\NEO_GEST
powershell -ExecutionPolicy Bypass -File 4_pruebas\pruebas\test_hu_01_04.ps1
powershell -ExecutionPolicy Bypass -File 4_pruebas\pruebas\test_hu_01_04_negativas.ps1
powershell -ExecutionPolicy Bypass -File 4_pruebas\pruebas\test_hu_04_cancelacion_stock.ps1
```

Resultado esperado:

```text
OK: HU-01, HU-02, HU-03 y HU-04 verificadas
OK: HU-01, HU-02, HU-03 y HU-04 validaciones negativas verificadas
OK: HU-04 cancelacion libera stock y bloquea pago posterior
```

## Matriz funcional

| HU | Criterio | Estado | Evidencia tecnica | Captura sugerida |
| --- | --- | --- | --- | --- |
| HU-01 | Valida que el email no exista previamente | Implementado | `POST /registro-cliente` devuelve HTTP 400 ante correo duplicado | Formulario de registro con mensaje de correo duplicado |
| HU-01 | Guarda contrasena en hash | Implementado | Tabla `Usuario.password_hash`; script `Neogestdb1.sql` usa hash bcrypt demo | Consulta SQL mostrando hash, sin texto plano |
| HU-01 | Asigna Rol ID = 3 al cliente | Implementado | `test_hu_01_04.ps1` registra cliente y permite login cliente | Registro exitoso o respuesta de API |
| HU-01 | Crea registro en CLIENTE vinculado al usuario | Implementado | Registro transaccional en backend, rollback si falla | Consulta SQL de `Usuario` + `cliente` |
| HU-02 | Solo Rol ID = 1 accede a empleados | Implementado | Prueba negativa valida HTTP 403 para cliente | Dashboard admin visible vs acceso denegado por API |
| HU-02 | Permite seleccionar/guardar cargo | Implementado | `POST /api/v1/empleados` guarda `cargo` | Formulario de empleados con cargo |
| HU-02 | Guarda `id_jefe_master` del creador | Implementado | Smoke test compara `id_jefe_master` con admin logueado | Respuesta API o consulta SQL de empleado |
| HU-03 | Muestra imagen, precio y dimensiones | Implementado | `GET /api/v1/productos/{id}` valida campos requeridos | Catalogo y modal de detalle |
| HU-03 | Deshabilita agregar si stock es 0 | Implementado | Producto agotado devuelve `disponible=false`; UI deshabilita boton | Producto agotado en catalogo |
| HU-03 | Filtra por categoria | Implementado | `GET /api/v1/productos?categoria_id=...`; UI usa categorias | Catalogo con filtro aplicado |
| HU-04 | Migra item_carrito a detalle_pedido | Implementado | Checkout crea `DetallePedido` desde items del carrito | Carrito antes y pedido despues |
| HU-04 | Congela precio en `precio_al_momento` | Implementado | Smoke test valida `precio_al_momento` en respuesta de checkout | Consulta SQL de `detalle_pedido` |
| HU-04 | Pedido inicia en `Pendiente` | Implementado | Smoke test valida `estado = Pendiente` | Panel de pedidos recientes |
| HU-04 | Descuenta stock tras confirmar | Implementado | Backend resta `stock_actual` dentro de la transaccion | Consulta SQL antes/despues o stock actualizado en catalogo |
| HU-04 | Permite cancelar pedido pendiente | Implementado | `POST /api/v1/pedidos/{pedido_id}/cancelar` cambia estado a `Cancelado` | Pedido pendiente con boton `Cancelar` |
| HU-04 | Restaura stock al cancelar | Implementado | `test_hu_04_cancelacion_stock.ps1` compara stock antes, despues del checkout y despues de cancelar | Catalogo mostrando stock restaurado |
| HU-04 | Vence pedidos pendientes | Implementado | Tarea periodica del backend usa `PENDING_ORDER_EXPIRATION_MINUTES` y `PENDING_ORDER_EXPIRATION_CHECK_SECONDS`; tambien se valida al consultar o pagar | Configuracion `.env` y pedido con estado `Vencido` |

## Pruebas negativas cubiertas

| Caso | Resultado esperado |
| --- | --- |
| Registro con correo duplicado | HTTP 400 |
| Registro con telefono invalido | HTTP 422 |
| Cliente consultando gestion de empleados | HTTP 403 |
| Consulta de carrito sin token | HTTP 401 |
| Agregar cantidad mayor al stock | HTTP 409 |
| Producto agotado en catalogo | `disponible=false` |
| Checkout con carrito vacio | HTTP 400 |
| Pago de pedido cancelado | HTTP 409 |
| Segunda cancelacion del mismo pedido | HTTP 409 |

## Checklist de capturas para el manual

1. Swagger abierto en `http://127.0.0.1:8000/docs`.
2. Registro de cliente con datos validos.
3. Registro de cliente con correo duplicado.
4. Login de cliente.
5. Catalogo completo con productos.
6. Filtro de categoria aplicado.
7. Modal de detalle con precio, dimensiones e imagen.
8. Producto agotado con boton deshabilitado.
9. Carrito con item agregado.
10. Confirmacion de checkout.
11. Panel de pedidos mostrando pedido `Pendiente`.
12. Modal de pago con mensaje de pedido pendiente.
13. Cancelacion de pedido pendiente.
14. Catalogo con stock restaurado despues de cancelar.
15. Login administrativo en `/#admin`.
16. Dashboard administrativo.
17. Creacion de empleado con cargo.
18. Consulta SQL de `Usuario.password_hash`.
19. Consulta SQL de `detalle_pedido.precio_al_momento`.

## Estado para avanzar

HU-01, HU-02, HU-03 y HU-04 quedan listas para cierre funcional. HU-04 ahora contempla reserva de stock, cancelacion manual, vencimiento automatico configurable y restauracion de inventario. Se recomienda guardar las capturas anteriores y anexar la salida de las pruebas automatizadas en el documento final.
