# Estado de implementacion por historias de usuario

Fecha de revision: 2026-08-20

Este documento compara las pautas del equipo contra el codigo actual del proyecto NEO GEST.

## Resumen ejecutivo

| HU | Estado | Lectura rapida |
| --- | --- | --- |
| HU-01 Registro de Cliente | Implementado | El frontend usa `POST /registro-cliente`; el backend crea usuario y cliente en una sola transaccion con password hash y rol cliente. |
| HU-02 Gestion de Empleados | Implementado | Admin rol 1 crea empleados con cargo, usuario rol 2 y trazabilidad en `id_jefe_master`; la ruta esta protegida con JWT. |
| HU-03 Catalogo y Detalle | Implementado | Lista, filtra, busca, muestra campos requeridos, deshabilita agotados y tiene modal de detalle conectado al backend. |
| HU-04 Checkout y Pedido | Implementado | El carrito autenticado se confirma como pedido pendiente, migra items a detalle_pedido, guarda precio historico, descuenta stock y limpia carrito con rollback ante errores. |
| HU-05 Pago y Facturacion | No implementado | Tablas existen, pero no hay endpoints ni flujo frontend. |
| HU-06 Gestion de Envios | No implementado | Tabla existe, dashboard muestra placeholder, no hay backend funcional. |
| HU-07 Auditoria de Inventario | No implementado | Tabla existe, pero no hay endpoints ni actualizacion de stock por movimiento. |
| HU-08 Gestion de Devoluciones | No implementado | Tabla existe, dashboard muestra placeholder, no hay backend funcional. |

## HU-01: Registro de Cliente

Estado: Implementado.

Implementado:

- El backend valida si el email ya existe antes de registrar usuario.
- La contrasena se guarda como hash con `passlib`.
- Existe creacion de usuario con rol cliente.
- Existe creacion de registro en `cliente`.
- Existe endpoint integral `POST /registro-cliente` que crea usuario y cliente en una sola operacion.
- El frontend usa `POST /registro-cliente`.
- Si falla la creacion, el backend hace rollback para evitar registros incompletos.
- El backend valida email, telefono, nombre y longitud minima de contrasena.
- El login devuelve JWT para proteger operaciones posteriores.

Detalle importante:

- El endpoint antiguo `POST /register` y `POST /clientes` siguen existiendo para pruebas manuales, pero el flujo principal del frontend ya no depende de dos llamadas separadas.

Archivos:

- `3_desarrollo/backend/app/routes/auth_routes.py`
- `3_desarrollo/backend/app/routes/cliente_routes.py`
- `3_desarrollo/backend/app/security/security.py`
- `3_desarrollo/frontend/src/components/RegisterModal.jsx`

## HU-02: Gestion de Empleados

Estado: Implementado.

Implementado:

- Modelo SQLAlchemy `Empleado`.
- Schema Pydantic para crear empleados.
- `GET /api/v1/empleados` para listar empleados con token admin.
- `POST /api/v1/empleados` para crear empleados con token admin.
- Validacion real: solo usuarios autenticados con `Rol_idRol = 1` pueden listar o crear empleados.
- El empleado se crea con usuario rol `2`.
- El cargo se guarda en la tabla `empleado`.
- `id_jefe_master` guarda el ID del admin que creo el empleado.
- Pantalla funcional en dashboard, pestana `Usuarios`.

Observacion:

- La historia menciona `id_jefe_o_master`, pero la base actual usa `id_jefe_master`; la implementacion usa el campo real de la base.

## HU-03: Visualizacion de Catalogo y Detalle

Estado: Implementado.

Implementado:

- Backend lista categorias: `GET /api/v1/categorias`.
- Backend lista productos: `GET /api/v1/productos`.
- Backend filtra por categoria: query param `categoria_id`.
- Backend busca por nombre: query param `q`.
- Backend obtiene producto por id: `GET /api/v1/productos/{producto_id}`.
- Frontend muestra imagen, precio, dimensiones, categoria, descripcion y stock.
- Si `stock_actual` es `0`, el boton `Agregar` queda deshabilitado.
- Se agrego una semilla demo con 6 categorias y 8 productos en `3_desarrollo/seed_catalogo_demo.sql`.
- El frontend tiene modal de detalle conectado a `GET /api/v1/productos/{producto_id}`.

Archivos:

- `3_desarrollo/backend/app/routes/catalogo_routes.py`
- `3_desarrollo/backend/app/models/catalogo.py`
- `3_desarrollo/frontend/src/components/Catalog.jsx`

## HU-04: Checkout y Generacion de Pedido

Estado: Implementado.

Implementado relacionado:

- Existe carrito funcional:
  - Consultar carrito.
  - Agregar item.
  - Actualizar cantidad.
  - Eliminar item.
  - Validar stock antes de agregar o actualizar.
- Existe endpoint `POST /api/v1/carrito/checkout`.
- Crea registro en `pedido` con estado inicial `Pendiente`.
- Migra los items del carrito a `detalle_pedido`.
- Guarda `precio_al_momento` con el precio del producto al confirmar.
- Descuenta `stock_actual`.
- Limpia los items del carrito al finalizar.
- Hace rollback si ocurre un error durante la confirmacion.
- Requiere token del cliente para confirmar.
- Existe `GET /api/v1/pedidos/mis-pedidos` para listar pedidos del cliente autenticado.

Frontend:

- El boton `Pagar Ahora (Checkout)` llama al endpoint real y muestra el numero de pedido creado.
- El frontend muestra resumen del pedido creado y una tabla de pedidos recientes.

Archivos relacionados:

- `3_desarrollo/backend/app/routes/carrito_routes.py`
- `3_desarrollo/frontend/src/components/Commerce.jsx`

## HU-05: Pago y Facturacion

Estado: No implementado.

Existe en base de datos:

- Tabla `pago`.
- Tabla `factura`.

No existe actualmente:

- Modelo SQLAlchemy `Pago`.
- Modelo SQLAlchemy `Factura`.
- Schemas.
- Endpoints para registrar pago.
- Cambio de estado de pedido a `Pagado`.
- Generacion de factura.
- Captura o validacion de `ruc_nit_cliente`.
- Flujo frontend.

## HU-06: Gestion de Envios

Estado: No implementado.

Existe en base de datos:

- Tabla `envio`.
- Campos para `empresa_transporte`, `codigo_seguimiento`, fechas, estado, pedido y empleado.

No existe actualmente:

- Modelo SQLAlchemy `Envio`.
- Schema.
- Endpoint.
- Pantalla funcional.
- Registro real del empleado responsable.
- Cambio automatico de estado a `En ruta`.

## HU-07: Auditoria de Inventario

Estado: No implementado.

Existe en base de datos:

- Tabla `movimiento_inventario`.
- Tipos permitidos actualmente: `Entrada`, `Salida`, `Ajuste`.

Diferencia con la HU:

- La HU pide tipos `Entrada`, `Salida`, `Devolucion`.
- La base actual tiene `Ajuste` en lugar de `Devolucion`.

No existe actualmente:

- Modelo SQLAlchemy.
- Schema.
- Endpoint.
- Pantalla funcional.
- Actualizacion automatica de `producto.stock_actual`.

## HU-08: Gestion de Devoluciones

Estado: No implementado.

Existe en base de datos:

- Tabla `devolucion`.
- Campos para motivo, estado, monto, pedido y empleado.

No existe actualmente:

- Modelo SQLAlchemy.
- Schema.
- Endpoint.
- Pantalla funcional.
- Listado por estado `Solicitada`.
- Aprobacion con monto de reembolso.
- Registro real del empleado que autoriza.

## Prioridad recomendada para avanzar

1. Implementar HU-05 de forma simple: pago simulado aprobado/rechazado y factura basica.
2. Implementar HU-06 para tracking de pedidos.
3. Implementar HU-07 para control de stock administrativo.
4. Implementar HU-08 al final, como indica su prioridad baja.

## Riesgos tecnicos encontrados

- Hay autenticacion JWT para rutas protegidas, pero todavia no existe refresco de token ni expiracion visual en frontend.
- La clave de MySQL fue movida a `.env`; revisar que `.env` no se suba al repositorio.
- El dashboard administrativo usa datos fijos y placeholders.
- Algunas tablas existen en SQL pero no estan modeladas en SQLAlchemy.
- La base local ya tiene catalogo demo cargado. Si se reinicia la base, volver a ejecutar `3_desarrollo/seed_catalogo_demo.sql`.

## Pruebas automatizadas

Se agregaron pruebas automatizadas para flujo exitoso y validaciones negativas.

Ejecutar con backend activo:

```powershell
powershell -ExecutionPolicy Bypass -File 4_pruebas\pruebas\test_hu_01_04.ps1
powershell -ExecutionPolicy Bypass -File 4_pruebas\pruebas\test_hu_01_04_negativas.ps1
```

La prueba de flujo exitoso valida:

- Login admin con token.
- Creacion de empleado por admin.
- Bloqueo de gestion de empleados para cliente.
- Detalle de producto.
- Registro de cliente.
- Agregar al carrito.
- Checkout.
- Listado de pedidos del cliente.

La prueba negativa valida:

- Registro con correo duplicado.
- Registro con telefono invalido.
- Bloqueo de gestion de empleados para cliente.
- Bloqueo de carrito sin token.
- Stock insuficiente.
- Producto agotado con `disponible=false`.
- Checkout con carrito vacio.

La matriz de cierre funcional, criterios de aceptacion y capturas sugeridas quedo en `4_pruebas/MATRIZ_CIERRE_HU_01_04.md`.
