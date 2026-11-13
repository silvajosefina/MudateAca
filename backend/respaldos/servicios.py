import os
import subprocess
from datetime import datetime, timedelta
from pathlib import Path

import cloudinary.api
import cloudinary.uploader
from django.conf import settings
from django.utils import timezone

PREFIJO = 'mudateaca_'
EXTENSION = '.dump'
FORMATO_FECHA = '%Y%m%d_%H%M%S'
CARPETA_EN_LA_NUBE = 'respaldos'
OPCIONES_EN_LA_NUBE = {'resource_type': 'raw', 'type': 'authenticated'}


class ErrorDeRespaldo(Exception):
    pass


def _programa(nombre):
    return str(Path(settings.PG_BIN_DIR) / nombre) if settings.PG_BIN_DIR else nombre


def _ejecutar(comando):
    base = settings.DATABASES['default']
    entorno = {**os.environ, 'PGPASSWORD': base['PASSWORD']}
    return subprocess.run(comando, env=entorno, capture_output=True, text=True, errors='replace')


def crear_respaldo(ahora=None):
    carpeta = Path(settings.RESPALDOS_DIR)
    carpeta.mkdir(parents=True, exist_ok=True)
    marca = (ahora or timezone.localtime()).strftime(FORMATO_FECHA)
    destino = carpeta / f'{PREFIJO}{marca}{EXTENSION}'
    base = settings.DATABASES['default']

    resultado = _ejecutar([
        _programa('pg_dump'), '--format=custom', '--no-owner',
        '--host', str(base['HOST']), '--port', str(base['PORT']), '--username', base['USER'],
        '--file', str(destino), base['NAME'],
    ])
    if resultado.returncode != 0:
        destino.unlink(missing_ok=True)
        raise ErrorDeRespaldo(f'pg_dump no pudo generar la copia: {resultado.stderr.strip()}')

    # Una copia que no se puede leer no sirve para restaurar: se verifica antes de darla por buena.
    verificacion = _ejecutar([_programa('pg_restore'), '--list', str(destino)])
    if verificacion.returncode != 0:
        destino.unlink(missing_ok=True)
        raise ErrorDeRespaldo(f'La copia generada no se puede leer: {verificacion.stderr.strip()}')
    return destino


def subir_a_la_nube(archivo):
    # RNF-11: una copia fuera del servidor, para que perder la base no implique perder todas las copias.
    with open(archivo, 'rb') as contenido:
        cloudinary.uploader.upload(
            contenido, public_id=f'{CARPETA_EN_LA_NUBE}/{archivo.name}', overwrite=False, **OPCIONES_EN_LA_NUBE,
        )


def _fecha_de(nombre):
    marca = nombre.removeprefix(PREFIJO).removesuffix(EXTENSION)
    try:
        return timezone.make_aware(datetime.strptime(marca, FORMATO_FECHA))
    except ValueError:
        return None


def limpiar_copias_locales(ahora=None):
    limite = (ahora or timezone.localtime()) - timedelta(days=settings.RETENCION_RESPALDOS_DIAS)
    borradas = []
    for archivo in Path(settings.RESPALDOS_DIR).glob(f'{PREFIJO}*{EXTENSION}'):
        fecha = _fecha_de(archivo.name)
        if fecha and fecha < limite:
            archivo.unlink()
            borradas.append(archivo.name)
    return borradas


def limpiar_copias_en_la_nube(ahora=None):
    limite = (ahora or timezone.now()) - timedelta(days=settings.RETENCION_RESPALDOS_DIAS)
    recursos = cloudinary.api.resources(
        prefix=f'{CARPETA_EN_LA_NUBE}/', max_results=500, **OPCIONES_EN_LA_NUBE,
    ).get('resources', [])
    viejas = [
        recurso['public_id'] for recurso in recursos
        if datetime.fromisoformat(recurso['created_at'].replace('Z', '+00:00')) < limite
    ]
    if viejas:
        cloudinary.api.delete_resources(viejas, **OPCIONES_EN_LA_NUBE)
    return viejas
