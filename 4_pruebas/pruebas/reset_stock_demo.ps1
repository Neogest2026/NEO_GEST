$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$SeedFile = Join-Path $RepoRoot "3_desarrollo\seed_catalogo_demo.sql"

if (-not (Test-Path $SeedFile)) {
    throw "No se encontro el archivo de semilla: $SeedFile"
}

$MysqlCommand = Get-Command mysql -ErrorAction SilentlyContinue
if (-not $MysqlCommand) {
    $DefaultMysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
    if (Test-Path $DefaultMysqlPath) {
        $MysqlCommand = Get-Item $DefaultMysqlPath
    }
}

if (-not $MysqlCommand) {
    throw "No se encontro mysql.exe. Agrega MySQL al PATH o ajusta este script con la ruta local."
}

Write-Host "Restaurando catalogo demo desde $SeedFile"
Write-Host "Cuando MySQL lo solicite, ingresa la clave local del usuario root."

Get-Content $SeedFile | & $MysqlCommand.Source -u root -p neogest

if ($LASTEXITCODE -ne 0) {
    throw "No fue posible restaurar el stock del catalogo demo"
}

Write-Host "OK: stock demo restaurado segun 3_desarrollo/seed_catalogo_demo.sql"
