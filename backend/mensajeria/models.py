from django.conf import settings
from django.db import models

from publicaciones.models import Publicacion


class Conversacion(models.Model):
    publicacion = models.ForeignKey(Publicacion, on_delete=models.PROTECT, related_name='conversaciones')
    interesado = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='conversaciones')
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'conversacion'
        verbose_name = 'conversación'
        verbose_name_plural = 'conversaciones'
        ordering = ['-actualizado_en']
        constraints = [
            models.UniqueConstraint(fields=['publicacion', 'interesado'], name='conversacion_unica_por_interesado'),
        ]

    def __str__(self):
        return f'Publicación {self.publicacion_id} - interesado {self.interesado_id}'


class Mensaje(models.Model):
    conversacion = models.ForeignKey(Conversacion, on_delete=models.CASCADE, related_name='mensajes')
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='mensajes')
    texto = models.TextField()
    leido = models.BooleanField(default=False)
    enviado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'mensaje'
        verbose_name = 'mensaje'
        verbose_name_plural = 'mensajes'
        ordering = ['enviado_en']

    def __str__(self):
        return f'Mensaje {self.pk} de la conversación {self.conversacion_id}'
