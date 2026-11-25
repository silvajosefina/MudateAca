# Compila el frontend en esta PC y lo publica en el servidor de producción.
# Uso, desde la carpeta del proyecto:
#   powershell -ExecutionPolicy Bypass -File frontend\desplegar.ps1

# Se revisa el código de salida de cada comando en lugar de usar ErrorActionPreference
# 'Stop': Windows PowerShell 5.1 trata como error fatal cualquier aviso que un programa
# escriba en stderr, como la advertencia de Vite sobre el tamaño de los archivos.
function Confirmar-Paso($mensaje) {
    if ($LASTEXITCODE -ne 0) {
        Write-Host $mensaje -ForegroundColor Red
        exit 1
    }
}

$clave = "$env:USERPROFILE\.ssh\mudateaca.key"
$servidor = 'ubuntu@147.15.32.159'
$destino = '/srv/mudateaca/frontend'

Set-Location $PSScriptRoot

npm.cmd run build
Confirmar-Paso 'La compilación falló: no se publicó nada.'

# Se sube a una carpeta aparte y después se reemplaza de una vez, para que nadie
# vea el sitio a medio copiar. La versión anterior queda en dist.anterior.
ssh -i $clave $servidor "rm -rf $destino/dist.nuevo"
Confirmar-Paso 'No se pudo conectar con el servidor.'

scp -i $clave -r dist "${servidor}:$destino/dist.nuevo"
Confirmar-Paso 'No se pudo copiar el frontend al servidor.'

# scp desde Windows deja los archivos solo legibles por su dueño; Nginx (www-data)
# necesita poder leerlos, así que se les da permiso de lectura antes de publicarlos.
ssh -i $clave $servidor "cd $destino && chmod -R a+rX dist.nuevo && rm -rf dist.anterior && mv dist dist.anterior && mv dist.nuevo dist"
Confirmar-Paso 'No se pudo reemplazar la versión publicada.'

Write-Host 'Frontend publicado en https://mudateaca.duckdns.org' -ForegroundColor Green