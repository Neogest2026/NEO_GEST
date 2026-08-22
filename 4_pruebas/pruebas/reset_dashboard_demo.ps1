$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$SeedFile = Join-Path $RepoRoot "3_desarrollo\seed_catalogo_demo.sql"

if (-not (Test-Path $SeedFile)) {
    throw "No se encontro el archivo de semilla: $SeedFile"
}

$MysqlExe = $null
$MysqlCommand = Get-Command mysql -ErrorAction SilentlyContinue
if ($MysqlCommand) {
    $MysqlExe = $MysqlCommand.Source
} else {
    $DefaultMysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
    if (Test-Path $DefaultMysqlPath) {
        $MysqlExe = $DefaultMysqlPath
    }
}

if (-not $MysqlExe) {
    throw "No se encontro mysql.exe. Agrega MySQL al PATH o ajusta este script con la ruta local."
}

$ResetSql = @"
USE neogest;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE factura;
TRUNCATE TABLE pago;
TRUNCATE TABLE envio;
TRUNCATE TABLE devolucion;
TRUNCATE TABLE detalle_pedido;
TRUNCATE TABLE item_carrito;
TRUNCATE TABLE carrito;
TRUNCATE TABLE movimiento_inventario;
TRUNCATE TABLE pedido;

SET FOREIGN_KEY_CHECKS = 1;
"@

$SeedSql = Get-Content -Raw $SeedFile

Write-Host "Reseteando datos transaccionales del dashboard en la base neogest"
Write-Host "Se conservan usuarios, roles, clientes, empleados, categorias y productos."
Write-Host "Se restaura el catalogo/stock demo desde $SeedFile"
Write-Host "Cuando MySQL lo solicite, ingresa la clave local del usuario root."

($ResetSql + "`n" + $SeedSql) | & $MysqlExe -u root -p neogest

if ($LASTEXITCODE -ne 0) {
    throw "No fue posible resetear los datos del dashboard"
}

Write-Host "OK: dashboard reseteado. Ventas, pedidos, pagos, envios, devoluciones, carritos y movimientos fueron limpiados."
