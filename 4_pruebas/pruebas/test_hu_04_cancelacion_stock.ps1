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

Write-Host "HU-04 cancelacion de pedido y restauracion de stock iniciada"

$productos = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/productos"
$producto = $productos | Where-Object { $_.stock_actual -gt 0 } | Sort-Object stock_actual -Descending | Select-Object -First 1
if (-not $producto) {
    throw "No hay productos con stock para probar cancelacion. Recarga 3_desarrollo/seed_catalogo_demo.sql"
}

$stockInicial = $producto.stock_actual

$registro = Invoke-Json -Method "POST" -Uri "$ApiUrl/registro-cliente" -Body @{
    email = "cliente_cancelacion_$RunId@neogest.local"
    password = "123456"
    nombre_completo = "Cliente Cancelacion"
    telefono = "3001234567"
    direccion_envio = "Calle Cancelacion 123"
    direccion_facturacion = "Calle Cancelacion 123"
    codigo_postal = "110111"
}

$login = Invoke-Json -Method "POST" -Uri "$ApiUrl/login" -Body @{
    email = "cliente_cancelacion_$RunId@neogest.local"
    password = "123456"
}

Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/carrito/items" -Token $login.access_token -Body @{
    usuario_id = $registro.idUsuario
    producto_id = $producto.id
    cantidad = 1
} | Out-Null

$pedido = Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/carrito/checkout" -Token $login.access_token -Body @{
    usuario_id = $registro.idUsuario
}
if ($pedido.estado -ne "Pendiente") { throw "El pedido no quedo Pendiente" }

$productoDespuesCheckout = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/productos/$($producto.id)"
if ($productoDespuesCheckout.stock_actual -ne ($stockInicial - 1)) {
    throw "El checkout no desconto el stock esperado"
}

$cancelado = Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/pedidos/$($pedido.idPedido)/cancelar" -Token $login.access_token
if ($cancelado.estado -ne "Cancelado") { throw "El pedido no quedo Cancelado" }

$productoDespuesCancelacion = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/productos/$($producto.id)"
if ($productoDespuesCancelacion.stock_actual -ne $stockInicial) {
    throw "La cancelacion no restauro el stock"
}

Expect-HttpStatus -Name "HU-04 no permite pagar pedido cancelado" -ExpectedStatus 409 -Action {
    Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/pagos" -Token $login.access_token -Body @{
        pedido_id = $pedido.idPedido
        metodo = "Tarjeta"
        ruc_nit_cliente = "900123456-7"
        estado_transaccion = "Aprobado"
    }
}

Expect-HttpStatus -Name "HU-04 no permite cancelar dos veces" -ExpectedStatus 409 -Action {
    Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/pedidos/$($pedido.idPedido)/cancelar" -Token $login.access_token
}

Write-Host "OK: HU-04 cancelacion libera stock y bloquea pago posterior"
