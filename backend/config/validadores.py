import os

from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError

TAMANO_MAXIMO_MB = 10


def validar_tamano(archivo):
    if archivo.size > TAMANO_MAXIMO_MB * 1024 * 1024:
        raise ValidationError(f'El archivo no puede superar los {TAMANO_MAXIMO_MB} MB.')


def validar_documento_verificacion(archivo):
    # La extensión la elige quien sube el archivo; el contenido tiene que coincidir con ella.
    validar_tamano(archivo)
    extension = os.path.splitext(archivo.name)[1].lower()
    archivo.seek(0)
    if extension == '.pdf':
        valido = archivo.read(5) == b'%PDF-'
    else:
        try:
            Image.open(archivo).verify()
            valido = True
        except (UnidentifiedImageError, OSError, SyntaxError):
            valido = False
    archivo.seek(0)
    if not valido:
        raise ValidationError('El contenido del archivo no corresponde a un PDF, JPG o PNG válido.')
