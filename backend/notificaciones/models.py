from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models

from config.borrado_logico import BorradoLogico
from config.catalogos import Catalogo


class TipoNotificacion(Catalogo):
    class Meta(Catalogo.Meta):
        db_table = 'tipo_notificacion'
        verbose_name = 'tipo de notificación'
        verbose_name_plural = 'tipos de notificación'


class Notificacion(BorradoLogico):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notificaciones')
    tipo = models.ForeignKey(TipoNotificacion, on_delete=models.PROTECT, related_name='notificaciones')
    mensaje = models.TextField()
    leida = models.BooleanField(default=False)

    # Objeto al que apunta la notificación (publicación, reclamo, conversación...).
    referencia_tipo = models.ForeignKey(
        ContentType, on_delete=models.PROTECT, blank=True, null=True, related_name='+',
    )
    referencia_id = models.BigIntegerField(blank=True, null=True)
    referencia = GenericForeignKey('referencia_tipo', 'referencia_id')

    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notificacion'
        verbose_name = 'notificación'
        verbose_name_plural = 'notificaciones'
        ordering = ['-creado_en']

    def __str__(self):
        return f'{self.mensaje[:40]} ({self.usuario_id})'
