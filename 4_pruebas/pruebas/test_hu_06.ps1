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

function Pagar-Pedido {
    param (
        [string]$Token,
        [int]$PedidoId
    )

    $pago = Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/pagos" -Token $Token -Body @{
        pedido_id = $PedidoId
        metodo = "Tarjeta"
        ruc_nit_cliente = "900123456-7"
        estado_transaccion = "Aprobado"
    }
    if ($pago.pedido_estado -ne "Pagado") { throw "El pedido no cambio a Pagado tras pago" }
    return $pago
}

Write-Host "HU-06 gestion de envios y tracking iniciado"

$productos = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/productos"
$producto = $productos | Where-Object { $_.stock_actual -ge 3 } | Sort-Object stock_actual -Descending | Select-Object -First 1
if (-not $producto) {
    throw "No hay producto con stock suficiente para HU-06. Recarga 3_desarrollo/seed_catalogo_demo.sql"
}

# Autenticacion admin (Rol 1) y cliente (Rol 3)
$adminLogin = Invoke-Json -Method "POST" -Uri "$ApiUrl/login" -Body @{
    email = "admin@neogest.com"
    password = "admin123"
}
if (-not $adminLogin.access_token) { throw "Login admin no devolvio token" }
if ($adminLogin.rol -ne 1) { throw "El admin no tiene rol 1" }

$empleado = Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/empleados" -Token $adminLogin.access_token -Body @{
    email = "logistica_envio_$RunId@neogest.local"
    password = "123456"
    nombre_empleado = "Logistica Envio"
    cargo = "Logistica"
}
if ($empleado.usuario.rol -ne 2) { throw "El empleado logistico no fue creado con rol 2" }

$logisticaLogin = Invoke-Json -Method "POST" -Uri "$ApiUrl/login" -Body @{
    email = "logistica_envio_$RunId@neogest.local"
    password = "123456"
}
if (-not $logisticaLogin.access_token) { throw "Login logistico no devolvio token" }
if ($logisticaLogin.rol -ne 2) { throw "El usuario logistico no tiene rol 2" }

$registro = Invoke-Json -Method "POST" -Uri "$ApiUrl/registro-cliente" -Body @{
    email = "cliente_envio_$RunId@neogest.local"
    password = "123456"
    nombre_completo = "Cliente Envio"
    telefono = "3001234567"
    direccion_envio = "Calle Envio 123"
    direccion_facturacion = "Calle Envio 123"
    codigo_postal = "110111"
}

$clienteLogin = Invoke-Json -Method "POST" -Uri "$ApiUrl/login" -Body @{
    email = "cliente_envio_$RunId@neogest.local"
    password = "123456"
}
if (-not $clienteLogin.access_token) { throw "Login cliente no devolvio token" }

$registroOtroCliente = Invoke-Json -Method "POST" -Uri "$ApiUrl/registro-cliente" -Body @{
    email = "cliente_envio_otro_$RunId@neogest.local"
    password = "123456"
    nombre_completo = "Cliente Envio Otro"
    telefono = "3007654321"
    direccion_envio = "Calle Ajena 456"
    direccion_facturacion = "Calle Ajena 456"
    codigo_postal = "110111"
}

$otroClienteLogin = Invoke-Json -Method "POST" -Uri "$ApiUrl/login" -Body @{
    email = "cliente_envio_otro_$RunId@neogest.local"
    password = "123456"
}
if (-not $otroClienteLogin.access_token) { throw "Login de otro cliente no devolvio token" }

# Pedido pagado (apto para despacho)
$pedidoPagado = Crear-Pedido -Token $clienteLogin.access_token -UsuarioId $registro.idUsuario -ProductoId $producto.id
$null = Pagar-Pedido -Token $clienteLogin.access_token -PedidoId $pedidoPagado.idPedido

# Pedido pendiente (NO apto para despacho)
$pedidoPendiente = Crear-Pedido -Token $clienteLogin.access_token -UsuarioId $registro.idUsuario -ProductoId $producto.id

# Pedido de otro cliente para validar aislamiento de rastreo
$pedidoOtroCliente = Crear-Pedido -Token $otroClienteLogin.access_token -UsuarioId $registroOtroCliente.idUsuario -ProductoId $producto.id

# CRITERIO 2 + 3: cliente no puede crear envios
Expect-HttpStatus -Name "HU-06 cliente bloqueado al registrar envio" -ExpectedStatus 403 -Action {
    Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/envios" -Token $clienteLogin.access_token -Body @{
        pedido_id = $pedidoPagado.idPedido
        empresa_transporte = "Servientrega"
        codigo_seguimiento = "SEG-$RunId"
    }
}

# CRITERIO 1: no se puede despachar un pedido no pagado
Expect-HttpStatus -Name "HU-06 bloquea envio de pedido no pagado" -ExpectedStatus 409 -Action {
    Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/envios" -Token $logisticaLogin.access_token -Body @{
        pedido_id = $pedidoPendiente.idPedido
        empresa_transporte = "Servientrega"
        codigo_seguimiento = "SEG-PEND-$RunId"
    }
}

# CRITERIOS 1, 2 y 3: registrar envio de pedido pagado
$envio = Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/envios" -Token $logisticaLogin.access_token -Body @{
    pedido_id = $pedidoPagado.idPedido
    empresa_transporte = "Servientrega"
    codigo_seguimiento = "SEG-$RunId"
}

if ($envio.estado -ne "En ruta") { throw "El envio no quedo en estado 'En ruta'" }
if ($envio.empresa_transporte -ne "Servientrega") { throw "No se guardo la empresa de transporte" }
if ($envio.codigo_seguimiento -ne "SEG-$RunId") { throw "No se guardo el codigo de seguimiento" }
if (-not $envio.empleado_id) { throw "No se registro el empleado que realizo el despacho" }
if (-not $envio.fecha_despacho) { throw "El envio no registro fecha de despacho" }
Write-Host "OK: HU-06 envio creado -> estado 'En ruta', empleado_id=$($envio.empleado_id), codigo=$($envio.codigo_seguimiento)"

# CRITERIO 2: no se puede duplicar el envio del mismo pedido
Expect-HttpStatus -Name "HU-06 evita envio duplicado del mismo pedido" -ExpectedStatus 409 -Action {
    Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/envios" -Token $logisticaLogin.access_token -Body @{
        pedido_id = $pedidoPagado.idPedido
        empresa_transporte = "Coordinadora"
        codigo_seguimiento = "DUP-$RunId"
    }
}

# Listar pedidos aptos para envio
$pedidosParaEnvio = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/envios/pedidos" -Token $logisticaLogin.access_token
$pendienteEnLista = $pedidosParaEnvio | Where-Object { $_.id -eq $pedidoPendiente.idPedido }
if ($pendienteEnLista) { throw "El pedido pendiente no deberia aparecer en la lista de pedidos aptos para envio" }
$pedidoPagadoEnLista = $pedidosParaEnvio | Where-Object { $_.id -eq $pedidoPagado.idPedido } | Select-Object -First 1
if (-not $pedidoPagadoEnLista.productos) { throw "La lista de pedidos para envio no incluye productos" }
if (-not $pedidoPagadoEnLista.cliente_direccion) { throw "La lista de pedidos para envio no incluye direccion del cliente" }
if ($pedidoPagadoEnLista.items.Count -lt 1) { throw "La lista de pedidos para envio no incluye items" }
Write-Host "OK: HU-06 lista de pedidos para envio devuelve informacion de despacho"

# Listar envios
$envios = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/envios" -Token $logisticaLogin.access_token
if (($envios | Where-Object { $_.id -eq $envio.id }).Count -eq 0) { throw "El envio creado no aparece en el listado" }
$envioListado = $envios | Where-Object { $_.id -eq $envio.id } | Select-Object -First 1
if (-not $envioListado.productos) { throw "El envio listado no incluye productos del pedido" }
if (-not $envioListado.cliente_direccion) { throw "El envio listado no incluye direccion del cliente" }

$resumenEnvios = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/envios/resumen" -Token $logisticaLogin.access_token
if (-not $resumenEnvios.metricas) { throw "El resumen de envios no devolvio metricas" }
if (($resumenEnvios.envios | Where-Object { $_.id -eq $envio.id }).Count -eq 0) { throw "El resumen de envios no incluye el envio creado" }
Write-Host "OK: HU-06 resumen logistico muestra metricas y envios enriquecidos"

# Obtener envio por id
$envioObtenido = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/envios/$($envio.id)" -Token $logisticaLogin.access_token
if ($envioObtenido.id -ne $envio.id) { throw "No se pudo obtener el envio por id" }
if ($envioObtenido.items.Count -lt 1) { throw "El detalle de envio no incluye items" }

# Actualizar tracking (cambiar estado y empresa)
$envioActualizado = Invoke-Json -Method "PATCH" -Uri "$ApiUrl/api/v1/envios/$($envio.id)" -Token $logisticaLogin.access_token -Body @{
    estado = "Entregado"
    empresa_transporte = "Servientrega"
    codigo_seguimiento = "SEG-$RunId"
}
if ($envioActualizado.estado -ne "Entregado") { throw "El PATCH no actualizo el estado del envio" }
Write-Host "OK: HU-06 actualizacion de tracking -> estado '$($envioActualizado.estado)'"

# Tracking para el cliente (rastreo)
$rastreo = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/envios/seguimiento/pedido/$($pedidoPagado.idPedido)" -Token $clienteLogin.access_token
if (-not $rastreo.tiene_envio) { throw "El cliente no puede rastrear su pedido despachado" }
if ($rastreo.codigo_seguimiento -ne "SEG-$RunId") { throw "El rastreo no devuelve el codigo de seguimiento" }
if ($rastreo.estado -ne "Entregado") { throw "El rastreo no refleja el estado actualizado" }
if ($rastreo.estado_pedido -ne "Entregado") { throw "El pedido no quedo sincronizado como Entregado" }
Write-Host "OK: HU-06 cliente rastrea su pedido -> empresa='$($rastreo.empresa_transporte)', estado='$($rastreo.estado)'"

# Cliente de otro pedido no puede rastrear
Expect-HttpStatus -Name "HU-06 cliente no rastrea pedidos ajenos" -ExpectedStatus 403 -Action {
    Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/envios/seguimiento/pedido/$($pedidoOtroCliente.idPedido)" -Token $clienteLogin.access_token
}

Write-Host "OK: HU-06 gestion de envios y tracking verificada"
