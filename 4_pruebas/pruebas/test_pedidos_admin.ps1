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

Write-Host "Modulo administrativo de pedidos iniciado"

$adminLogin = Invoke-Json -Method "POST" -Uri "$ApiUrl/login" -Body @{
    email = "admin@neogest.com"
    password = "admin123"
}

$empleado = Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/empleados" -Token $adminLogin.access_token -Body @{
    email = "pedidos_empleado_$RunId@neogest.local"
    password = "123456"
    nombre_empleado = "Empleado Pedidos"
    cargo = "Ventas"
}
if ($empleado.usuario.rol -ne 2) { throw "El empleado no fue creado con rol 2" }

$empleadoLogin = Invoke-Json -Method "POST" -Uri "$ApiUrl/login" -Body @{
    email = "pedidos_empleado_$RunId@neogest.local"
    password = "123456"
}

$registroCliente = Invoke-Json -Method "POST" -Uri "$ApiUrl/registro-cliente" -Body @{
    email = "pedidos_cliente_$RunId@neogest.local"
    password = "123456"
    nombre_completo = "Cliente Pedidos"
    telefono = "3001234567"
    direccion_envio = "Calle Pedidos 123"
    direccion_facturacion = "Calle Pedidos 123"
    codigo_postal = "110111"
}

$clienteLogin = Invoke-Json -Method "POST" -Uri "$ApiUrl/login" -Body @{
    email = "pedidos_cliente_$RunId@neogest.local"
    password = "123456"
}

$productos = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/productos"
$producto = $productos | Where-Object { $_.stock_actual -ge 1 } | Sort-Object stock_actual -Descending | Select-Object -First 1
if (-not $producto) {
    throw "No hay producto con stock disponible para validar pedidos"
}
$stockAntes = (Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/productos/$($producto.id)").stock_actual

Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/carrito/items" -Token $clienteLogin.access_token -Body @{
    usuario_id = $registroCliente.idUsuario
    producto_id = $producto.id
    cantidad = 1
} | Out-Null

$pedido = Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/carrito/checkout" -Token $clienteLogin.access_token -Body @{
    usuario_id = $registroCliente.idUsuario
}
if ($pedido.estado -ne "Pendiente") { throw "El pedido no quedo pendiente" }

$stockReservado = (Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/productos/$($producto.id)").stock_actual
if ($stockReservado -ne ($stockAntes - 1)) { throw "El checkout no desconto stock para reservar el pedido" }

Expect-HttpStatus -Name "Pedidos admin bloquea clientes" -ExpectedStatus 403 -Action {
    Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/pedidos/admin/resumen" -Token $clienteLogin.access_token
}

$resumenAdmin = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/pedidos/admin/resumen" -Token $adminLogin.access_token
if (-not $resumenAdmin.metricas) { throw "El resumen admin no devolvio metricas" }
if (($resumenAdmin.pedidos | Where-Object { $_.id -eq $pedido.idPedido }).Count -eq 0) {
    throw "El pedido creado por cliente no aparece en modulo admin"
}

$detalleEmpleado = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/pedidos/admin/$($pedido.idPedido)" -Token $empleadoLogin.access_token
if ($detalleEmpleado.cliente.nombre -ne "Cliente Pedidos") { throw "El detalle no incluye cliente correcto" }
if ($detalleEmpleado.items.Count -lt 1) { throw "El detalle no incluye items" }
if ($detalleEmpleado.items[0].precio_al_momento -le 0) { throw "El detalle no conserva precio historico" }
Write-Host "OK: admin/empleado ven pedido, cliente, items y precio historico"

$cancelado = Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/pedidos/admin/$($pedido.idPedido)/cancelar" -Token $adminLogin.access_token
if ($cancelado.estado -ne "Cancelado") { throw "El pedido no cambio a Cancelado" }

$stockRestaurado = (Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/productos/$($producto.id)").stock_actual
if ($stockRestaurado -ne $stockAntes) { throw "La cancelacion administrativa no libero stock" }

Expect-HttpStatus -Name "Pedidos admin evita cancelar dos veces" -ExpectedStatus 409 -Action {
    Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/pedidos/admin/$($pedido.idPedido)/cancelar" -Token $adminLogin.access_token
}

Write-Host "OK: modulo administrativo de pedidos verificado"
