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

Write-Host "Restaurando catalogo demo desde $SeedFile"
Write-Host "Cuando MySQL lo solicite, ingresa la clave local del usuario root."

Get-Content -Raw $SeedFile | & $MysqlExe -u root -p neogest

if ($LASTEXITCODE -ne 0) {
    throw "No fue posible restaurar el stock del catalogo demo"
}

Write-Host "OK: stock demo restaurado segun 3_desarrollo/seed_catalogo_demo.sql"
