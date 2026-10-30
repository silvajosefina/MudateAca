from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class RegistroAuditoria(models.Model):
    # RNF-12: registro de las operaciones relevantes; nunca se edita ni se borra.
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='acciones_auditadas')
    tipo_accion = models.CharField(max_length=30)

    referencia_tipo = models.ForeignKey(ContentType, on_delete=models.PROTECT, related_name='+')
    referencia_id = models.BigIntegerField()
    referencia = GenericForeignKey('referencia_tipo', 'referencia_id')

    detalle = models.TextField(blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'registro_auditoria'
        verbose_name = 'registro de auditoría'
        verbose_name_plural = 'registros de auditoría'
        ordering = ['-creado_en']

    def __str__(self):
        return f'{self.tipo_accion} - actor {self.actor_id}'
