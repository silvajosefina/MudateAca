from django.db.models.signals import post_save
from django.dispatch import receiver

from notificaciones.servicios import notificar, resumen
from publicaciones.models import Publicacion

from .models import Favorito

# RF-14: los estados de revisión interna no se avisan; el resto sí.
AVISOS_POR_ESTADO = {
    'activa': ('está nuevamente disponible', 'exito'),
    'pausada': ('fue pausada', 'error'),
    'reservada': ('fue reservada', 'error'),
    'alquilada': ('fue marcada como alquilada', 'error'),
    'archivada': ('ya no está disponible', 'error'),
    'eliminada': ('ya no está disponible', 'error'),
}


@receiver(post_save, sender=Publicacion)
def avisar_cambio_de_estado_a_favoritos(sender, instance, created, **kwargs):
    estado_anterior = getattr(instance, 'estado_id_guardado', None)
    instance.estado_id_guardado = instance.estado_id
    if created or estado_anterior == instance.estado_id or instance.estado.codigo not in AVISOS_POR_ESTADO:
        return

    texto, tipo = AVISOS_POR_ESTADO[instance.estado.codigo]
    interesados = [favorito.usuario for favorito in Favorito.objects.filter(publicacion=instance).select_related('usuario')]
    notificar(
        interesados,
        f'Una publicación que guardaste en favoritos {texto}: "{resumen(instance.descripcion)}".',
        tipo,
        instance,
    )
