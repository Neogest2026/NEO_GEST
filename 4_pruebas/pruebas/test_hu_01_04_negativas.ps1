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

Write-Host "HU-01..HU-04 pruebas negativas iniciadas"

$adminLogin = Invoke-Json -Method "POST" -Uri "$ApiUrl/login" -Body @{
    email = "admin@neogest.com"
    password = "admin123"
}
if (-not $adminLogin.access_token) { throw "Login admin no devolvio token" }

$clienteLogin = Invoke-Json -Method "POST" -Uri "$ApiUrl/login" -Body @{
    email = "test1@gmail.com"
    password = "123456"
}
if (-not $clienteLogin.access_token) { throw "Login cliente no devolvio token" }

Expect-HttpStatus -Name "HU-01 correo duplicado" -ExpectedStatus 400 -Action {
    Invoke-Json -Method "POST" -Uri "$ApiUrl/registro-cliente" -Body @{
        email = "test1@gmail.com"
        password = "123456"
        nombre_completo = "Cliente Duplicado"
        telefono = "3001234567"
        direccion_envio = "Calle 1"
        direccion_facturacion = "Calle 1"
        codigo_postal = "110111"
    }
}

Expect-HttpStatus -Name "HU-01 telefono invalido" -ExpectedStatus 422 -Action {
    Invoke-Json -Method "POST" -Uri "$ApiUrl/registro-cliente" -Body @{
        email = "cliente_invalido_$RunId@neogest.local"
        password = "123456"
        nombre_completo = "Cliente Invalido"
        telefono = "telefono"
        direccion_envio = "Calle 1"
        direccion_facturacion = "Calle 1"
        codigo_postal = "110111"
    }
}

Expect-HttpStatus -Name "HU-02 cliente sin permiso para empleados" -ExpectedStatus 403 -Action {
    Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/empleados" -Token $clienteLogin.access_token
}

Expect-HttpStatus -Name "HU-04 carrito sin token" -ExpectedStatus 401 -Action {
    Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/carrito/$($clienteLogin.idUsuario)"
}

$registroPruebas = Invoke-Json -Method "POST" -Uri "$ApiUrl/registro-cliente" -Body @{
    email = "cliente_negativo_$RunId@neogest.local"
    password = "123456"
    nombre_completo = "Cliente Pruebas Negativas"
    telefono = "3001234567"
    direccion_envio = "Calle Negativa 123"
    direccion_facturacion = "Calle Negativa 123"
    codigo_postal = "110111"
}

$loginPruebas = Invoke-Json -Method "POST" -Uri "$ApiUrl/login" -Body @{
    email = "cliente_negativo_$RunId@neogest.local"
    password = "123456"
}

Expect-HttpStatus -Name "HU-04 stock insuficiente" -ExpectedStatus 409 -Action {
    Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/carrito/items" -Token $loginPruebas.access_token -Body @{
        usuario_id = $registroPruebas.idUsuario
        producto_id = 1
        cantidad = 999999
    }
}

$productos = Invoke-Json -Method "GET" -Uri "$ApiUrl/api/v1/productos"
$agotado = $productos | Where-Object { $_.stock_actual -eq 0 } | Select-Object -First 1
if (-not $agotado) {
    throw "HU-03 no encontro producto agotado para validar disponible=false"
}
if ($agotado.disponible -ne $false) {
    throw "HU-03 producto agotado no devolvio disponible=false"
}
Write-Host "OK: HU-03 producto agotado reporta disponible=false"

Expect-HttpStatus -Name "HU-04 checkout con carrito vacio" -ExpectedStatus 400 -Action {
    Invoke-Json -Method "POST" -Uri "$ApiUrl/api/v1/carrito/checkout" -Token $loginPruebas.access_token -Body @{
        usuario_id = $registroPruebas.idUsuario
    }
}

Write-Host "OK: HU-01, HU-02, HU-03 y HU-04 validaciones negativas verificadas"
