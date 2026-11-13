import os
import time
import uuid

import cloudinary.uploader
import cloudinary.utils
from django.conf import settings
from django.core.files.storage import FileSystemStorage, Storage, storages
from django.utils.deconstruct import deconstructible
from django.utils.functional import cached_property


def almacenamiento_privado():
    # RNF-06: la documentación de verificación nunca queda en una carpeta pública.
    return storages['privado']


@deconstructible
class AlmacenamientoPrivadoLocal(FileSystemStorage):
    # Sin Cloudinary, guarda en PRIVADO_ROOT: fuera de MEDIA_ROOT, el servidor nunca la publica.
    @cached_property
    def base_location(self):
        return self._value_or_setting(self._location, settings.PRIVADO_ROOT)

    def _clear_cached_properties(self, setting, **kwargs):
        super()._clear_cached_properties(setting, **kwargs)
        if setting == 'PRIVADO_ROOT':
            self.__dict__.pop('base_location', None)
            self.__dict__.pop('location', None)


@deconstructible
class AlmacenamientoCloudinary(Storage):
    """Guarda archivos en Cloudinary (restricción del SRS).

    Los públicos (fotos) se entregan por su URL. Los privados (documentación y backups) quedan como
    'authenticated': solo se descargan con un enlace firmado que vence a los pocos minutos.
    """

    def __init__(self, privado=False, tipo_recurso='image', vigencia_segundos=600):
        self.privado = privado
        self.tipo_recurso = tipo_recurso
        self.vigencia_segundos = vigencia_segundos

    @property
    def tipo_entrega(self):
        return 'authenticated' if self.privado else 'upload'

    def _opciones(self):
        return {'resource_type': self.tipo_recurso, 'type': self.tipo_entrega}

    def _separar(self, nombre):
        # En los archivos 'raw' la extensión es parte del identificador; en las imágenes es el formato.
        if self.tipo_recurso == 'raw':
            return nombre, None
        identificador, extension = os.path.splitext(nombre)
        return identificador, extension.lstrip('.') or None

    def _save(self, nombre, contenido):
        carpeta, archivo = os.path.split(nombre)
        extension = os.path.splitext(archivo)[1].lower()
        identificador = f'{carpeta}/{uuid.uuid4().hex}' if carpeta else uuid.uuid4().hex
        if self.tipo_recurso == 'raw':
            identificador += extension
        contenido.seek(0)
        resultado = cloudinary.uploader.upload(contenido, public_id=identificador, overwrite=False, **self._opciones())
        if self.tipo_recurso == 'raw':
            return resultado['public_id']
        formato = resultado.get('format') or extension.lstrip('.')
        return f"{resultado['public_id']}.{formato}" if formato else resultado['public_id']

    def exists(self, nombre):
        # Cada archivo recibe un identificador aleatorio, así que nunca se pisan.
        return False

    def url(self, nombre):
        identificador, formato = self._separar(nombre)
        if self.privado:
            return cloudinary.utils.private_download_url(
                identificador, formato, expires_at=int(time.time()) + self.vigencia_segundos, **self._opciones(),
            )
        return cloudinary.utils.cloudinary_url(identificador, format=formato, secure=True, **self._opciones())[0]

    def delete(self, nombre):
        identificador, _ = self._separar(nombre)
        cloudinary.uploader.destroy(identificador, invalidate=True, **self._opciones())
