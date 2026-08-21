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

function Crear-Pedido {
    param (
        [string]$Token,
        [int]$UsuarioId,
        [int]$ProductoId
    )

    Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/carrito/items" -Token $Token -Body @{
        usuario_id = $UsuarioId
        producto_id = $ProductoId
        cantidad = 1
    } | Out-Null

    $pedido = Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/carrito/checkout" -Token $Token -Body @{
        usuario_id = $UsuarioId
    }
    if ($pedido.estado -ne "Pendiente") { throw "El pedido no quedo Pendiente" }
    return $pedido
}

Write-Host "HU-05 pago y facturacion iniciado"

$productos = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/productos"
$producto = $productos | Where-Object { $_.stock_actual -ge 2 } | Sort-Object stock_actual -Descending | Select-Object -First 1
if (-not $producto) {
    throw "No hay producto con stock suficiente para HU-05. Recarga 3_desarrollo/seed_catalogo_demo.sql"
}

$registro = Invoke-Json -Method "POST" -Uri "$ApiUrl/registro-cliente" -Body @{
    email = "cliente_pago_$RunId@neogest.local"
    password = "123456"
    nombre_completo = "Cliente Pago"
    telefono = "3001234567"
    direccion_envio = "Calle Pago 123"
    direccion_facturacion = "Calle Pago 123"
    codigo_postal = "110111"
}

$login = Invoke-Json -Method "POST" -Uri "$ApiUrl/login" -Body @{
    email = "cliente_pago_$RunId@neogest.local"
    password = "123456"
}
if (-not $login.access_token) { throw "Login cliente no devolvio token" }

$pedidoAprobado = Crear-Pedido -Token $login.access_token -UsuarioId $registro.idUsuario -ProductoId $producto.id

$pago = Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/pagos" -Token $login.access_token -Body @{
    pedido_id = $pedidoAprobado.idPedido
    metodo = "Tarjeta"
    ruc_nit_cliente = "900123456-7"
    estado_transaccion = "Aprobado"
}

if ($pago.estado_transaccion -ne "Aprobado") { throw "El pago no quedo Aprobado" }
if ($pago.pedido_estado -ne "Pagado") { throw "El pedido no cambio a Pagado" }
if ($pago.monto -ne $pedidoAprobado.total_compra) { throw "El pago no tomo el total real del pedido" }
if (-not $pago.factura) { throw "No se genero factura para pago aprobado" }
if ($pago.factura.ruc_nit_cliente -ne "900123456-7") { throw "La factura no guardo el RUC/NIT del cliente" }
if (-not $pago.factura.url_pdf) { throw "La factura no devolvio URL de PDF" }
if (-not $pago.factura.cliente_nombre) { throw "La factura no devolvio datos fiscales del cliente" }
if (-not $pago.factura.empresa_nit) { throw "La factura no devolvio datos fiscales del emisor" }

$pedidoConsultado = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/pedidos/$($pedidoAprobado.idPedido)" -Token $login.access_token
if ($pedidoConsultado.estado -ne "Pagado") { throw "La consulta del pedido no refleja estado Pagado" }

$comprobante = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/pagos/pedido/$($pedidoAprobado.idPedido)" -Token $login.access_token
if ($comprobante.factura.numero_factura -ne $pago.factura.numero_factura) {
    throw "El comprobante consultado no coincide con la factura generada"
}

$pdfPath = Join-Path $env:TEMP "neogest_factura_$RunId.pdf"
$headersPath = Join-Path $env:TEMP "neogest_factura_$RunId.headers"
& curl.exe -sS -L -D $headersPath -o $pdfPath -H "Authorization: Bearer $($login.access_token)" "$ApiUrl$($pago.factura.url_pdf)"
if ($LASTEXITCODE -ne 0) {
    throw "No fue posible descargar el PDF de factura"
}
$pdfHeaders = Get-Content $headersPath -Raw
if ($pdfHeaders -notmatch "content-type:\s*application/pdf") {
    throw "La descarga de factura no devolvio application/pdf"
}
if ((Get-Item $pdfPath).Length -lt 1000) {
    throw "El PDF de factura parece estar incompleto"
}
Remove-Item $pdfPath, $headersPath -Force

$envioCorreo = Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/pagos/facturas/$($pago.factura.id)/email" -Token $login.access_token -Body @{
    email_destino = "cliente_pago_$RunId@neogest.local"
}
if (-not $envioCorreo.mensaje) { throw "El endpoint de correo no devolvio mensaje" }

Expect-HttpStatus -Name "HU-05 evita pago aprobado duplicado" -ExpectedStatus 409 -Action {
    Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/pagos" -Token $login.access_token -Body @{
        pedido_id = $pedidoAprobado.idPedido
        metodo = "Tarjeta"
        ruc_nit_cliente = "900123456-7"
        estado_transaccion = "Aprobado"
    }
}

$pedidoRechazado = Crear-Pedido -Token $login.access_token -UsuarioId $registro.idUsuario -ProductoId $producto.id

$pagoRechazado = Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/pagos" -Token $login.access_token -Body @{
    pedido_id = $pedidoRechazado.idPedido
    metodo = "PSE"
    ruc_nit_cliente = "900123456-7"
    estado_transaccion = "Rechazado"
}

if ($pagoRechazado.estado_transaccion -ne "Rechazado") { throw "El pago rechazado no guardo estado Rechazado" }
if ($pagoRechazado.pedido_estado -ne "Pendiente") { throw "El pago rechazado cambio el estado del pedido" }
if ($pagoRechazado.factura) { throw "El pago rechazado no debe generar factura" }

Write-Host "OK: HU-05 pago aprobado, factura y validaciones verificadas"
