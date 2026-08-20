# Manual base del proyecto NEO GEST

Fecha de revision: 2026-08-06

Este documento resume lo que existe actualmente en el proyecto, como se ejecuta y que partes se pueden documentar con capturas.

## 1. Resumen general

NEO GEST es una aplicacion web para una tienda de muebles. El proyecto actual esta dividido en:

- Frontend: React + Vite, ubicado en `3_desarrollo/frontend`.
- Backend: FastAPI + SQLAlchemy, ubicado en `3_desarrollo/backend`.
- Base de datos: MySQL, con script principal en `3_desarrollo/neogest.sql`.
- Documentacion y analisis: carpetas `1_requisitos`, `2_analisis_diseno` y `4_pruebas`.

La aplicacion muestra una tienda publica con landing, catalogo, detalle de producto, registro de clientes, login, carrito de compras, checkout de pedido y dashboard administrativo. En el dashboard, la pestana `Usuarios` permite gestionar empleados; otros modulos administrativos aun son pantallas de maqueta con datos fijos.

## 2. Estructura del proyecto

```text
NEO_GEST/
  README.md
  index.html
  1_requisitos/
    DOCUMENTACION.md
    documentacion_neogest.md.resolved
    credenciales neogest.docx
    Historias de usuario y RF y RNF.docx
  2_analisis_diseno/
    Modelo_relacional.pdf
    DIAGRAMA ENTIDAD RELACION PROYECTO NEOGEST (1).svg
    Neogest db.mwb
  3_desarrollo/
    neogest.sql
    guia_insta.docx
    backend/
      requirements.txt
      app/
        main.py
        database.py
        routes/
        models/
        schemas/
        security/
    frontend/
      package.json
      vite.config.js
      src/
        App.jsx
        main.jsx
        components/
      public/images/
  4_pruebas/
    pruebas/
      *.sql
```

El desarrollo activo esta en `3_desarrollo/backend` y `3_desarrollo/frontend`. El `index.html` de la raiz parece ser una version estatica anterior.

## 3. Requisitos para ejecutarlo

- Node.js y npm para el frontend.
- Python 3.8 o superior para el backend. En este equipo funciona con `py`.
- MySQL 8 en ejecucion.
- Base de datos llamada `neogest`.

En este equipo se valido:

- Node: `v24.14.1`
- npm: `11.11.0`
- Python: `3.14.3`, usando `py`
- MySQL: servicio `MySQL80_JUAN` esta corriendo
- Cliente MySQL encontrado en `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe`

Importante: la conexion del backend se configura desde:

```text
3_desarrollo/backend/.env
```

En esta revision se actualizo la clave local suministrada por el propietario del equipo. Como la clave contiene `#`, dentro de la URL de conexion debe quedar escapada como `%23`.

## 4. Instalacion y ejecucion

### 4.1. Preparar la base de datos

Abrir PowerShell en la raiz del proyecto:

```powershell
cd C:\Users\jebus\OneDrive\Documentos\NEO_GEST
```

Crear la base de datos:

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "CREATE DATABASE IF NOT EXISTS neogest CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
```

Importar el script compatible con el backend actual:

```powershell
Get-Content .\3_desarrollo\neogest.sql | & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p neogest
```

El script recomendado es `3_desarrollo/neogest.sql`, porque usa la columna `password_hash`, que es la que consulta el backend. Varios scripts de `4_pruebas/pruebas` usan columna `password` y no coinciden con el codigo actual.

Para cargar el catalogo demo usado en esta revision:

```powershell
Get-Content .\3_desarrollo\seed_catalogo_demo.sql | & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p neogest
```

La base local quedo con 6 categorias y 8 productos demo.

### 4.2. Ejecutar backend

En una terminal:

```powershell
cd C:\Users\jebus\OneDrive\Documentos\NEO_GEST\3_desarrollo\backend
py -m pip install -r requirements.txt
py -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

URLs del backend:

- API base: `http://127.0.0.1:8000/`
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

Validacion esperada del endpoint base:

```json
{"mensaje":"API NeoGest funcionando correctamente"}
```

### 4.3. Ejecutar frontend

En otra terminal:

```powershell
cd C:\Users\jebus\OneDrive\Documentos\NEO_GEST\3_desarrollo\frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

URL del frontend:

- Tienda: `http://127.0.0.1:5173/`
- Login administrativo: `http://127.0.0.1:5173/#admin`

El build de produccion fue validado con:

```powershell
npm run build
```

Resultado: compila correctamente.

### 4.4. Ejecutar prueba automatizada HU-01 a HU-04

Con el backend activo:

```powershell
cd C:\Users\jebus\OneDrive\Documentos\NEO_GEST
powershell -ExecutionPolicy Bypass -File 4_pruebas\pruebas\test_hu_01_04.ps1
```

Resultado esperado:

```text
OK: HU-01, HU-02, HU-03 y HU-04 verificadas
```

## 5. Credenciales encontradas

En el SQL actual:

- Administrador: `admin@neogest.com` / `admin123`
- Cliente de prueba: `test1@gmail.com` / `123456`
- Cliente de prueba: `glosman_21@hotmai.com` / `123456`

En documentos antiguos tambien aparece `admin@neogest.com / admin` y `cliente@neogest.com / cliente`, pero esas credenciales no coinciden con los hashes del script `3_desarrollo/neogest.sql`.

## 6. Funcionamiento del sistema

### 6.1. Flujo publico de tienda

El componente principal es `src/App.jsx`.

Cuando el usuario abre la tienda, se muestra:

- Navbar con logo, menu, buscador, carrito, login y registro.
- Hero/slider automatico con imagenes de muebles.
- Catalogo de productos.
- Footer.

El frontend consume el backend desde:

```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
```

El catalogo consulta:

- `GET /api/v1/categorias`
- `GET /api/v1/productos`
- `GET /api/v1/productos?categoria_id=...`
- `GET /api/v1/productos?q=...`
- `GET /api/v1/productos/{producto_id}` para abrir el detalle.

La pantalla de detalle muestra imagen, nombre, descripcion, precio, dimensiones, peso, categoria, stock disponible y boton para agregar al carrito si el producto tiene stock.

### 6.2. Registro de cliente

El registro se abre desde el boton `Unirse`.

Campos del formulario:

- Nombre completo
- Telefono
- Direccion de envio
- Direccion de facturacion
- Codigo postal
- Correo electronico
- Password

El frontend registra clientes con `POST /registro-cliente`, que crea usuario y cliente en una sola llamada. El backend usa una transaccion: si falla la creacion del cliente, tambien revierte la creacion del usuario.

Los endpoints `POST /register` y `POST /clientes` siguen disponibles para pruebas manuales o uso administrativo, pero el flujo principal de registro ya no depende de dos llamadas separadas.

### 6.3. Login y roles

El login llama a:

```text
POST /login
```

Payload:

```json
{
  "email": "admin@neogest.com",
  "password": "admin123"
}
```

Respuesta esperada:

```json
{
  "mensaje": "Login exitoso",
  "idUsuario": 2,
  "rol": 1
}
```

Si `rol` es `1`, el frontend entra al dashboard admin. Cualquier otro rol se toma como cliente. El frontend guarda la sesion en `localStorage` con la llave `neogest_user`.

El login devuelve `access_token` tipo bearer. El frontend guarda ese token en `localStorage` y lo envia en operaciones protegidas como carrito, checkout, pedidos y gestion de empleados.

### 6.4. Carrito de compras

Para agregar productos al carrito, el usuario debe estar autenticado como cliente.

Endpoints usados:

- `GET /api/v1/carrito/{usuario_id}`: consulta el carrito del cliente asociado al usuario.
- `POST /api/v1/carrito/items`: agrega producto.
- `PATCH /api/v1/carrito/items/{item_id}`: cambia cantidad.
- `DELETE /api/v1/carrito/items/{item_id}?usuario_id=...`: elimina item.

Reglas implementadas:

- Si el usuario no ha iniciado sesion como cliente, se muestra un mensaje en pantalla y se abre login.
- Si el producto no existe, backend responde `404`.
- Si no hay stock suficiente, backend responde `409`.
- Si el item ya existe en el carrito, se suma la cantidad.
- Si la cantidad baja de `1`, el frontend elimina el item.

El boton `Pagar Ahora (Checkout)` confirma el carrito contra `POST /api/v1/carrito/checkout`.

Al confirmar:

- Se crea un registro en `pedido` con estado `Pendiente`.
- Se crean registros en `detalle_pedido`.
- Se guarda `precio_al_momento`.
- Se descuenta `stock_actual`.
- Se eliminan los items del carrito.

El pago y la factura todavia no estan implementados.

### 6.5. Dashboard administrativo

Se accede entrando a:

```text
http://127.0.0.1:5173/#admin
```

Luego iniciar sesion con usuario administrador.

Pantallas visibles:

- Resumen General
- Inventario
- Pedidos
- Envios
- Facturacion
- Devolucion
- Usuarios
- Configuracion

Estado actual:

- `Resumen General` muestra tarjetas y una tabla de ultimos pedidos, pero con datos fijos.
- `Usuarios` permite registrar empleados y listarlos desde la base de datos.
- Los demas modulos muestran una pantalla placeholder indicando que el modulo esta siendo actualizado.
- No hay llamadas reales a API para estadisticas, pedidos, inventario, envios, facturacion o configuracion desde el dashboard.

### 6.6. Gestion de empleados

Solo usuarios con rol `1` pueden gestionar empleados.

Endpoints usados:

- `GET /api/v1/empleados`
- `POST /api/v1/empleados`

Al crear empleado:

- Se crea un usuario con rol `2`.
- La contrasena se guarda como hash.
- Se crea un registro en `empleado`.
- El cargo se guarda en `empleado.cargo`.
- El administrador creador queda trazado en `empleado.id_jefe_master`.
Ambos endpoints requieren encabezado `Authorization: Bearer <token_admin>`.

### 6.7. Pedidos del cliente

Despues del checkout, el cliente puede ver sus pedidos recientes en la tienda.

Endpoint usado:

- `GET /api/v1/pedidos/mis-pedidos`

Este endpoint requiere token del cliente autenticado.

## 7. Endpoints del backend

Rutas detectadas:

| Metodo | Ruta | Uso |
| --- | --- | --- |
| GET | `/` | Verifica que la API esta activa |
| POST | `/register` | Crear usuario |
| POST | `/login` | Iniciar sesion |
| POST | `/clientes` | Crear cliente asociado a usuario |
| POST | `/registro-cliente` | Crear usuario cliente y cliente en una llamada |
| GET | `/api/v1/categorias` | Listar categorias |
| GET | `/api/v1/productos` | Listar productos, con filtros opcionales |
| GET | `/api/v1/productos/{producto_id}` | Obtener detalle de producto |
| GET | `/api/v1/carrito/{usuario_id}` | Consultar carrito |
| POST | `/api/v1/carrito/items` | Agregar item al carrito |
| PATCH | `/api/v1/carrito/items/{item_id}` | Actualizar cantidad |
| DELETE | `/api/v1/carrito/items/{item_id}?usuario_id=...` | Eliminar item |
| POST | `/api/v1/carrito/checkout` | Confirmar carrito y crear pedido |
| GET | `/api/v1/empleados` | Listar empleados como admin |
| POST | `/api/v1/empleados` | Crear empleado como admin |
| GET | `/api/v1/pedidos/mis-pedidos` | Listar pedidos del cliente autenticado |
| GET | `/api/v1/pedidos/{pedido_id}` | Consultar un pedido del cliente autenticado |

## 8. Modelo de datos actual

Tablas principales presentes en `3_desarrollo/neogest.sql`:

- `rol`
- `usuario`
- `cliente`
- `empleado`
- `categoria`
- `producto`
- `carrito`
- `item_carrito`
- `pedido`
- `detalle_pedido`
- `pago`
- `factura`
- `envio`
- `devolucion`
- `movimiento_inventario`

Tablas usadas directamente por el backend actual:

- `usuario`
- `cliente`
- `categoria`
- `producto`
- `carrito`
- `item_carrito`
- `pedido`
- `detalle_pedido`
- `empleado`

Tablas modeladas en SQL pero sin endpoints actuales:

- `pago`
- `factura`
- `envio`
- `devolucion`
- `movimiento_inventario`

## 9. Capturas recomendadas para el manual

Capturas tecnicas:

1. Estructura de carpetas del proyecto.
2. Terminal backend ejecutando `uvicorn`.
3. Terminal frontend ejecutando `npm run dev`.
4. Swagger UI en `http://127.0.0.1:8000/docs`.
5. Respuesta del endpoint `/`.

Capturas funcionales:

1. Pagina principal con hero/slider.
2. Navbar con buscador y carrito.
3. Catalogo de productos.
4. Filtro por categoria.
5. Busqueda de productos.
6. Modal de registro.
7. Pantalla de login.
8. Carrito abierto con productos.
9. Login administrativo desde `/#admin`.
10. Dashboard administrativo.
11. Gestion de empleados en la pestana `Usuarios`.
12. Pantallas placeholder de inventario, pedidos, envios, facturacion, devolucion y configuracion.

Capturas de analisis/diseno:

1. Diagrama entidad-relacion SVG.
2. Modelo relacional PDF.
3. Historias de usuario y requisitos.

## 10. Observaciones importantes

- El frontend compila correctamente.
- El backend arranca correctamente.
- La API base y Swagger cargan correctamente.
- La conexion MySQL ya fue validada con la clave local configurada.
- El login admin fue validado correctamente con `admin@neogest.com / admin123`.
- El script SQL mas compatible es `3_desarrollo/neogest.sql`.
- El catalogo demo fue cargado con `3_desarrollo/seed_catalogo_demo.sql`.
- El detalle de producto ya esta conectado al backend.
- La gestion de empleados ya crea usuario rol 2 y empleado desde el dashboard con token admin.
- El checkout ya crea pedido, detalle de pedido, descuenta stock y permite listar pedidos del cliente.
- Los componentes React principales fueron limpiados de mensajes con codificacion rota.
- El dashboard admin es parcialmente maqueta.
- Pago, facturacion, envios y devoluciones estan modelados en base de datos, pero no implementados como flujo funcional completo.

## 11. Ruta sugerida para completar documentacion

1. Corregir o confirmar credenciales de MySQL.
2. Importar `3_desarrollo/neogest.sql`.
3. Cargar datos de prueba para `categoria` y `producto`.
4. Levantar backend y frontend.
5. Tomar capturas siguiendo la lista del punto 9.
6. Separar el manual final en:
   - Manual tecnico de instalacion.
   - Manual de usuario cliente.
   - Manual de administrador.
   - Manual de API/backend.
