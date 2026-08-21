$ErrorActionPreference = "Stop"

$ApiUrl = "http://127.0.0.1:8000"
$RunId = Get-Date -Format "yyyyMMddHHmmss"

function Invoke-Json {
    param (
        [string]$Method,
        [string]$Uri,
        [object]$Body = $null,
        [string]$Token = $null
    )

    $Headers = @{ "Content-Type" = "application/json" }
    if ($Token) {
        $Headers["Authorization"] = "Bearer $Token"
    }

    if ($Body -ne $null) {
        return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers -Body ($Body | ConvertTo-Json)
    }
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers
}

Write-Host "HU-01..HU-04 smoke test iniciado"

$adminLogin = Invoke-Json -Method "POST" -Uri "$ApiUrl/login" -Body @{
    email = "admin@neogest.com"
    password = "admin123"
}
if (-not $adminLogin.access_token) { throw "Login admin no devolvio token" }
if (-not $adminLogin.nombre) { throw "Login admin no devolvio nombre visible" }

$empleado = Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/empleados" -Token $adminLogin.access_token -Body @{
    email = "empleado_smoke_$RunId@neogest.local"
    password = "empleado123"
    nombre_empleado = "Empleado Smoke"
    cargo = "Logistica"
}
if ($empleado.usuario.rol -ne 2) { throw "Empleado no fue creado con rol 2" }
if ($empleado.id_jefe_master -ne $adminLogin.idUsuario) { throw "Empleado no guardo jefe master correcto" }

$clienteLogin = Invoke-Json -Method "POST" -Uri "$ApiUrl/login" -Body @{
    email = "test1@gmail.com"
    password = "123456"
}
try {
    Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/empleados" -Token $clienteLogin.access_token | Out-Null
    throw "Cliente pudo consultar empleados"
} catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 403) { throw }
}

$producto = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/productos/1"
if (-not $producto.imagen_url -or -not $producto.precio_unitario -or -not $producto.dimensiones) {
    throw "Detalle de producto incompleto"
}

$productosDisponibles = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/productos"
$productoDisponible = $productosDisponibles | Where-Object { $_.stock_actual -gt 0 } | Sort-Object stock_actual -Descending | Select-Object -First 1
if (-not $productoDisponible) {
    throw "No hay productos con stock para probar carrito. Recarga 3_desarrollo/seed_catalogo_demo.sql"
}

$registro = Invoke-Json -Method "POST" -Uri "$ApiUrl/registro-cliente" -Body @{
    email = "cliente_smoke_$RunId@neogest.local"
    password = "123456"
    nombre_completo = "Cliente Smoke"
    telefono = "3001234567"
    direccion_envio = "Calle Smoke 123"
    direccion_facturacion = "Calle Smoke 123"
    codigo_postal = "110111"
}

$nuevoClienteLogin = Invoke-Json -Method "POST" -Uri "$ApiUrl/login" -Body @{
    email = "cliente_smoke_$RunId@neogest.local"
    password = "123456"
}
if ($nuevoClienteLogin.nombre -ne "Cliente Smoke") { throw "Login cliente no devolvio nombre completo" }

$carrito = Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/carrito/items" -Token $nuevoClienteLogin.access_token -Body @{
    usuario_id = $registro.idUsuario
    producto_id = $productoDisponible.id
    cantidad = 1
}
if ($carrito.items.Count -lt 1) { throw "El carrito no recibio items" }

$pedido = Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/carrito/checkout" -Token $nuevoClienteLogin.access_token -Body @{
    usuario_id = $registro.idUsuario
}
if ($pedido.estado -ne "Pendiente") { throw "Pedido no quedo Pendiente" }
if ($pedido.items.Count -lt 1) { throw "Pedido no genero detalle" }
if (-not $pedido.items[0].precio_al_momento) { throw "Detalle no guardo precio_al_momento" }

$pedidos = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/pedidos/mis-pedidos" -Token $nuevoClienteLogin.access_token
if ($pedidos.Count -lt 1) { throw "No se listaron pedidos del cliente" }

Write-Host "OK: HU-01, HU-02, HU-03 y HU-04 verificadas"
