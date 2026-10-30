from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from auditoria.servicios import registrar_accion

from .models import EstadoPublicacion, Publicacion

# RF-08: pasados estos días, una publicación alquilada se archiva.
DIAS_ALQUILADA_VISIBLE = 7

ESTADOS_LISTADO_PUBLICO = ('activa',)
# RF-08: lo alquilado sigue accesible desde favoritos o enlaces directos.
ESTADOS_DETALLE_PUBLICO = ('activa', 'reservada', 'alquilada')
ESTADOS_EDITABLES = ('pendiente_moderacion', 'activa', 'pausada', 'observada', 'rechazada')
ESTADOS_EN_REVISION = ('pendiente_moderacion', 'observada')
# Un cambio del anunciante en estos estados vuelve a la cola del administrador.
ESTADOS_QUE_VUELVEN_A_REVISION = ('pendiente_moderacion', 'observada', 'rechazada')

TRANSICIONES_DEL_ANUNCIANTE = {
    'activa': ('pausada', 'reservada', 'alquilada'),
    'pausada': ('activa',),
    'reservada': ('activa', 'alquilada'),
    'alquilada': ('activa',),
}


def cambiar_estado(publicacion, codigo_destino):
    if codigo_destino not in TRANSICIONES_DEL_ANUNCIANTE.get(publicacion.estado.codigo, ()):
        raise ValidationError({'estado': ['Esta publicación no puede pasar a ese estado.']})

    publicacion.estado = EstadoPublicacion.por_codigo(codigo_destino)
    publicacion.alquilada_en = timezone.now() if codigo_destino == 'alquilada' else None
    publicacion.save(update_fields=['estado', 'alquilada_en', 'actualizado_en'])


@transaction.atomic
def eliminar_logicamente(publicacion, actor):
    if publicacion.estado.codigo == 'eliminada':
        raise ValidationError({'detail': 'Esta publicación ya fue eliminada.'})

    estado_anterior = publicacion.estado.codigo
    publicacion.estado = EstadoPublicacion.por_codigo('eliminada')
    publicacion.save(update_fields=['estado', 'actualizado_en'])
    registrar_accion(actor, 'eliminacion_logica', publicacion, f'Estado anterior: {estado_anterior}')


def archivar_vencidas():
    ahora = timezone.now()
    return Publicacion.objects.filter(
        estado__codigo='alquilada',
        alquilada_en__lte=ahora - timedelta(days=DIAS_ALQUILADA_VISIBLE),
    ).update(estado=EstadoPublicacion.por_codigo('archivada'), actualizado_en=ahora)
