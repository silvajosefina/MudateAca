from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from respaldos.servicios import (
    ErrorDeRespaldo,
    crear_respaldo,
    limpiar_copias_en_la_nube,
    limpiar_copias_locales,
    subir_a_la_nube,
)


class Command(BaseCommand):
    # RNF-11: se programa una vez por día. En el servidor, por ejemplo con cron a las 3:00:
    # 0 3 * * * cd /ruta/al/backend && .venv/bin/python manage.py respaldar_base
    help = 'Genera una copia verificada de la base, la sube a Cloudinary y borra las de más de 7 días.'

    def handle(self, *args, **opciones):
        try:
            copia = crear_respaldo()
        except ErrorDeRespaldo as error:
            raise CommandError(str(error)) from error
        self.stdout.write(f'Copia generada y verificada: {copia}')

        if settings.USAR_CLOUDINARY:
            try:
                subir_a_la_nube(copia)
            except Exception as error:
                # La copia local ya existe: el error se informa sin borrarla.
                raise CommandError(f'La copia quedó en el servidor, pero no se pudo subir a Cloudinary: {error}') from error
            self.stdout.write('Copia subida a Cloudinary.')
            self.stdout.write(f'Copias viejas borradas en Cloudinary: {len(limpiar_copias_en_la_nube())}')
        else:
            self.stdout.write(self.style.WARNING(
                'Cloudinary no está configurado: la copia solo quedó en este equipo (RNF-11 pide otra ubicación).',
            ))
        self.stdout.write(f'Copias viejas borradas en el servidor: {len(limpiar_copias_locales())}')
