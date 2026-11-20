from django.core.management.base import BaseCommand

from publicaciones.estados import DIAS_ALQUILADA_VISIBLE, archivar_vencidas


class Command(BaseCommand):
    # Se ejecuta con el cron del servidor (RF-08): ver cron/mudateaca.crontab.
    help = f'Archiva las publicaciones alquiladas hace {DIAS_ALQUILADA_VISIBLE} días o más.'

    def handle(self, *args, **opciones):
        cantidad = archivar_vencidas()
        self.stdout.write(f'Publicaciones archivadas: {cantidad}')
