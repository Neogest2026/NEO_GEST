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

function Expect-HttpStatus {
    param (
        [string]$Name,
        [int]$ExpectedStatus,
        [scriptblock]$Action
    )

    try {
        & $Action | Out-Null
    } catch {
        if (-not $_.Exception.Response) {
            throw
        }
        $StatusCode = $_.Exception.Response.StatusCode.value__
        if ($StatusCode -ne $ExpectedStatus) {
            throw "$Name devolvio HTTP $StatusCode; se esperaba HTTP $ExpectedStatus"
        }
        Write-Host "OK: $Name -> HTTP $ExpectedStatus"
        return
    }
    throw "$Name no fallo; se esperaba HTTP $ExpectedStatus"
}

Write-Host "Dashboard admin/empleado con datos reales iniciado"

$adminLogin = Invoke-Json -Method "POST" -Uri "$ApiUrl/login" -Body @{
    email = "admin@neogest.com"
    password = "admin123"
}

$empleado = Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/empleados" -Token $adminLogin.access_token -Body @{
    email = "dashboard_empleado_$RunId@neogest.local"
    password = "123456"
    nombre_empleado = "Empleado Dashboard"
    cargo = "Ventas"
}

$empleadoLogin = Invoke-Json -Method "POST" -Uri "$ApiUrl/login" -Body @{
    email = "dashboard_empleado_$RunId@neogest.local"
    password = "123456"
}
if ($empleadoLogin.rol -ne 2) { throw "El usuario empleado no tiene rol 2" }

$productos = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/productos"
$producto = $productos | Where-Object { $_.stock_actual -ge 1 } | Sort-Object stock_actual -Descending | Select-Object -First 1
if (-not $producto) {
    throw "No hay producto con stock disponible para validar dashboard"
}

$registroCliente = Invoke-Json -Method "POST" -Uri "$ApiUrl/registro-cliente" -Body @{
    email = "dashboard_cliente_$RunId@neogest.local"
    password = "123456"
    nombre_completo = "Cliente Dashboard"
    telefono = "3001234567"
    direccion_envio = "Calle Dashboard 123"
    direccion_facturacion = "Calle Dashboard 123"
    codigo_postal = "110111"
}

$clienteLogin = Invoke-Json -Method "POST" -Uri "$ApiUrl/login" -Body @{
    email = "dashboard_cliente_$RunId@neogest.local"
    password = "123456"
}

Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/carrito/items" -Token $clienteLogin.access_token -Body @{
    usuario_id = $registroCliente.idUsuario
    producto_id = $producto.id
    cantidad = 1
} | Out-Null

$pedido = Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/carrito/checkout" -Token $clienteLogin.access_token -Body @{
    usuario_id = $registroCliente.idUsuario
}
if ($pedido.estado -ne "Pendiente") { throw "El pedido de prueba no quedo Pendiente" }

Expect-HttpStatus -Name "Dashboard bloquea clientes" -ExpectedStatus 403 -Action {
    Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/dashboard/resumen" -Token $clienteLogin.access_token
}

$dashboardAdmin = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/dashboard/resumen" -Token $adminLogin.access_token
if ($dashboardAdmin.metricas.pedidos_pendientes -lt 1) { throw "Dashboard admin no refleja pedidos pendientes" }
if ($dashboardAdmin.metricas.productos_en_stock -lt 0) { throw "Dashboard admin devolvio stock invalido" }
if (-not $dashboardAdmin.ultimos_pedidos) { throw "Dashboard admin no devolvio ultimos pedidos" }
if (($dashboardAdmin.ultimos_pedidos | Where-Object { $_.id -eq $pedido.idPedido }).Count -eq 0) {
    throw "El pedido creado por cliente no aparece en ultimos pedidos del dashboard"
}
Write-Host "OK: dashboard admin muestra metricas y pedido cliente #$($pedido.idPedido)"

$dashboardEmpleado = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/dashboard/resumen" -Token $empleadoLogin.access_token
if (-not $dashboardEmpleado.metricas) { throw "Dashboard empleado no devolvio metricas" }
if (($dashboardEmpleado.ultimos_pedidos | Where-Object { $_.id -eq $pedido.idPedido }).Count -eq 0) {
    throw "El empleado no ve el pedido creado por cliente"
}

Write-Host "OK: dashboard empleado sincronizado con base de datos"
Write-Host "OK: Dashboard admin/empleado verificado"
