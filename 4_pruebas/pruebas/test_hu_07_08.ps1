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

    return Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/carrito/checkout" -Token $Token -Body @{
        usuario_id = $UsuarioId
    }
}

function Pagar-Pedido {
    param (
        [string]$Token,
        [int]$PedidoId
    )

    return Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/pagos" -Token $Token -Body @{
        pedido_id = $PedidoId
        metodo = "Tarjeta"
        ruc_nit_cliente = "900123456-7"
        estado_transaccion = "Aprobado"
    }
}

function Crear-Producto-Con-Imagen {
    param (
        [string]$Token,
        [int]$CategoriaId,
        [string]$Nombre
    )

    $ImagePath = Join-Path $env:TEMP "neogest_producto_$RunId.png"
    $ResponsePath = Join-Path $env:TEMP "neogest_producto_$RunId.json"
    [IO.File]::WriteAllBytes($ImagePath, [Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="))

    $Status = & curl.exe -s -o $ResponsePath -w "%{http_code}" -X POST "$ApiUrl/api/v1/inventario/productos" `
        -H "Authorization: Bearer $Token" `
        -F "nombre=$Nombre" `
        -F "descripcion=Producto creado desde prueba automatizada" `
        -F "categoria_id=$CategoriaId" `
        -F "precio_unitario=990000" `
        -F "stock_actual=3" `
        -F "dimensiones=100 x 50 x 75 cm" `
        -F "peso=18.5" `
        -F "imagen=@$ImagePath;type=image/png"

    $Body = Get-Content $ResponsePath -Raw
    Remove-Item $ImagePath, $ResponsePath -Force -ErrorAction SilentlyContinue

    if ([int]$Status -ne 201) {
        throw "Crear producto devolvio HTTP ${Status}: $Body"
    }
    return $Body | ConvertFrom-Json
}

Write-Host "HU-07 auditoria de inventario y HU-08 devoluciones iniciado"

$adminLogin = Invoke-Json -Method "POST" -Uri "$ApiUrl/login" -Body @{
    email = "admin@neogest.com"
    password = "admin123"
}
if ($adminLogin.rol -ne 1) { throw "El admin no tiene rol 1" }

$empleado = Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/empleados" -Token $adminLogin.access_token -Body @{
    email = "bodega_$RunId@neogest.local"
    password = "123456"
    nombre_empleado = "Empleado Bodega"
    cargo = "Inventario"
}
if ($empleado.usuario.rol -ne 2) { throw "El empleado de bodega no fue creado con rol 2" }

$bodegaLogin = Invoke-Json -Method "POST" -Uri "$ApiUrl/login" -Body @{
    email = "bodega_$RunId@neogest.local"
    password = "123456"
}
if ($bodegaLogin.rol -ne 2) { throw "El usuario de bodega no tiene rol 2" }

$categorias = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/categorias"
$categoria = $categorias | Select-Object -First 1
if (-not $categoria) { throw "No hay categorias para crear producto" }

$productoCreado = Crear-Producto-Con-Imagen -Token $bodegaLogin.access_token -CategoriaId $categoria.id -Nombre "Producto Inventario $RunId"
if (-not $productoCreado.imagen_url.StartsWith("/static/uploads/productos/")) { throw "El producto creado no guardo URL de imagen local" }
if ($productoCreado.stock_actual -ne 3) { throw "El producto creado no guardo stock inicial" }
$imagenSubida = Invoke-WebRequest -Uri "$ApiUrl$($productoCreado.imagen_url)" -UseBasicParsing
if ($imagenSubida.StatusCode -ne 200) { throw "La imagen subida no se puede consultar desde static" }

$productoPublico = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/productos/$($productoCreado.id)"
if ($productoPublico.nombre -ne $productoCreado.nombre) { throw "El producto creado no aparece en catalogo publico" }
Write-Host "OK: Producto creado desde inventario con imagen y visible en catalogo"

$productoEliminado = Invoke-Json -Method "DELETE" -Uri "$ApiUrl/api/v1/inventario/productos/$($productoCreado.id)" -Token $bodegaLogin.access_token
if ($productoEliminado.id -ne $productoCreado.id) { throw "El producto eliminado no corresponde al producto creado" }
Expect-HttpStatus -Name "Producto eliminado oculto del catalogo publico" -ExpectedStatus 404 -Action {
    Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/productos/$($productoCreado.id)"
}
$resumenTrasEliminar = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/inventario/resumen" -Token $bodegaLogin.access_token
if (($resumenTrasEliminar.productos | Where-Object { $_.id -eq $productoCreado.id }).Count -gt 0) {
    throw "El producto eliminado sigue apareciendo en inventario activo"
}
Write-Host "OK: Producto eliminado logicamente y oculto de catalogo/inventario"

$registroCliente = Invoke-Json -Method "POST" -Uri "$ApiUrl/registro-cliente" -Body @{
    email = "cliente_inv_dev_$RunId@neogest.local"
    password = "123456"
    nombre_completo = "Cliente Inventario Devolucion"
    telefono = "3001234567"
    direccion_envio = "Calle Inventario 123"
    direccion_facturacion = "Calle Inventario 123"
    codigo_postal = "110111"
}

$clienteLogin = Invoke-Json -Method "POST" -Uri "$ApiUrl/login" -Body @{
    email = "cliente_inv_dev_$RunId@neogest.local"
    password = "123456"
}

$productos = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/productos"
$producto = $productos | Where-Object { $_.stock_actual -ge 2 } | Sort-Object stock_actual -Descending | Select-Object -First 1
if (-not $producto) {
    throw "No hay producto con stock suficiente. Recarga 3_desarrollo/seed_catalogo_demo.sql"
}

Expect-HttpStatus -Name "HU-07 cliente bloqueado al registrar movimiento" -ExpectedStatus 403 -Action {
    Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/inventario/movimientos" -Token $clienteLogin.access_token -Body @{
        producto_id = $producto.id
        tipo = "Entrada"
        cantidad = 1
        observacion = "Intento no autorizado"
    }
}

$productoAntes = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/productos/$($producto.id)"
$stockInicial = $productoAntes.stock_actual

$salida = Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/inventario/movimientos" -Token $bodegaLogin.access_token -Body @{
    producto_id = $producto.id
    tipo = "Salida"
    cantidad = 1
    observacion = "Merma por dano en bodega"
}
if ($salida.stock_nuevo -ne ($stockInicial - 1)) { throw "La salida no desconto stock correctamente" }
if (-not $salida.fecha) { throw "El movimiento no registro fecha" }
if (-not $salida.empleado_id) { throw "El movimiento no registro empleado responsable" }
Write-Host "OK: HU-07 salida desconto stock y registro empleado $($salida.empleado_id)"

$entrada = Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/inventario/movimientos" -Token $bodegaLogin.access_token -Body @{
    producto_id = $producto.id
    tipo = "Entrada"
    cantidad = 2
    observacion = "Reposicion manual"
}
if ($entrada.stock_nuevo -ne ($stockInicial + 1)) { throw "La entrada no sumo stock correctamente" }

$devolucionStock = Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/inventario/movimientos" -Token $bodegaLogin.access_token -Body @{
    producto_id = $producto.id
    tipo = "Devolucion"
    cantidad = 1
    observacion = "Producto retornado apto para venta"
}
if ($devolucionStock.stock_nuevo -ne ($stockInicial + 2)) { throw "La devolucion de inventario no sumo stock correctamente" }
if ($devolucionStock.stock_anterior -ne ($stockInicial + 1)) { throw "La devolucion no reporto el stock anterior correcto" }

Expect-HttpStatus -Name "HU-07 evita stock negativo" -ExpectedStatus 409 -Action {
    Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/inventario/movimientos" -Token $bodegaLogin.access_token -Body @{
        producto_id = $producto.id
        tipo = "Salida"
        cantidad = 999999
        observacion = "Salida imposible"
    }
}

$movimientos = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/inventario/movimientos" -Token $bodegaLogin.access_token
if (($movimientos | Where-Object { $_.id -eq $devolucionStock.id }).Count -eq 0) { throw "El movimiento de devolucion no aparece en auditoria" }
$resumenInventario = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/inventario/resumen" -Token $bodegaLogin.access_token
if (-not $resumenInventario.metricas) { throw "El resumen de inventario no devolvio metricas" }
if (($resumenInventario.productos | Where-Object { $_.id -eq $producto.id }).Count -eq 0) { throw "El resumen de inventario no incluye el producto auditado" }
Write-Host "OK: HU-07 auditoria de inventario verificada"

$pedido = Crear-Pedido -Token $clienteLogin.access_token -UsuarioId $registroCliente.idUsuario -ProductoId $producto.id
$null = Pagar-Pedido -Token $clienteLogin.access_token -PedidoId $pedido.idPedido

$solicitud = Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/devoluciones" -Token $bodegaLogin.access_token -Body @{
    pedido_id = $pedido.idPedido
    motivo = "Cliente reporta dano visible en el mueble"
}
if ($solicitud.estado -ne "Solicitada") { throw "La devolucion no quedo en estado Solicitada" }
if ($solicitud.monto_reembolso -ne 0) { throw "La solicitud inicial debe quedar con monto 0" }
if (-not $solicitud.empleado_id) { throw "La solicitud no registro empleado" }

$solicitadas = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/devoluciones?estado=Solicitada" -Token $bodegaLogin.access_token
if (($solicitadas | Where-Object { $_.id -eq $solicitud.id }).Count -eq 0) { throw "La devolucion solicitada no aparece en el listado" }
Write-Host "OK: HU-08 muestra solicitudes en estado Solicitada"

Expect-HttpStatus -Name "HU-08 exige monto al aprobar" -ExpectedStatus 422 -Action {
    Invoke-Json -Method "PATCH" -Uri "$ApiUrl/api/v1/devoluciones/$($solicitud.id)" -Token $bodegaLogin.access_token -Body @{
        estado = "Aprobada"
    }
}

$aprobada = Invoke-Json -Method "PATCH" -Uri "$ApiUrl/api/v1/devoluciones/$($solicitud.id)" -Token $bodegaLogin.access_token -Body @{
    estado = "Aprobada"
    monto_reembolso = 100000
}
if ($aprobada.estado -ne "Aprobada") { throw "La devolucion no cambio a Aprobada" }
if ($aprobada.monto_reembolso -ne 100000) { throw "No se guardo el monto de reembolso" }
if ($aprobada.empleado_id -ne $empleado.id) { throw "No quedo registrado el empleado que autorizo" }
Write-Host "OK: HU-08 devolucion aprobada con monto e id_empleado=$($aprobada.empleado_id)"

$solicitadasFinal = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/devoluciones?estado=Solicitada" -Token $bodegaLogin.access_token
if (($solicitadasFinal | Where-Object { $_.id -eq $solicitud.id }).Count -gt 0) { throw "La devolucion aprobada no debe seguir como Solicitada" }

Write-Host "OK: HU-07 y HU-08 verificadas"
