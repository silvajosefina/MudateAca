from django.db.models.signals import post_save
from django.dispatch import receiver

from publicaciones.models import Publicacion

from .coincidencias import recalcular_por_publicacion


@receiver(post_save, sender=Publicacion)
def actualizar_coincidencias_de_publicacion(sender, instance, **kwargs):
    if instance.estado.codigo == 'activa':
        recalcular_por_publicacion(instance.id)
