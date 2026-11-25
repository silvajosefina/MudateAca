# Compila el frontend en esta PC y lo publica en el servidor de producción.
# Uso, desde la carpeta del proyecto:
#   powershell -ExecutionPolicy Bypass -File frontend\desplegar.ps1
$ErrorActionPreference = 'Stop'

$clave = "$env:USERPROFILE\.ssh\mudateaca.key"
$servidor = 'ubuntu@147.15.32.159'
$destino = '/srv/mudateaca/frontend'

Set-Location $PSScriptRoot

npm run build
if ($LASTEXITCODE -ne 0) { throw 'La compilación falló: no se publicó nada.' }

# Se sube a una carpeta aparte y después se reemplaza de una vez, para que nadie
# vea el sitio a medio copiar. La versión anterior queda en dist.anterior.
ssh -i $clave $servidor "rm -rf $destino/dist.nuevo"
scp -i $clave -r dist "${servidor}:$destino/dist.nuevo"
if ($LASTEXITCODE -ne 0) { throw 'No se pudo copiar el frontend al servidor.' }
ssh -i $clave $servidor "cd $destino && rm -rf dist.anterior && mv dist dist.anterior && mv dist.nuevo dist"

Write-Host 'Frontend publicado en https://mudateaca.duckdns.org'
