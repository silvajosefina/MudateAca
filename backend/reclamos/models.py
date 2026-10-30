from django.conf import settings
from django.db import models

from config.catalogos import Catalogo
from publicaciones.models import Publicacion


class EstadoReclamo(Catalogo):
    class Meta(Catalogo.Meta):
        db_table = 'estado_reclamo'
        verbose_name = 'estado de reclamo'
        verbose_name_plural = 'estados de reclamo'


class Reclamo(models.Model):
    reclamante = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='reclamos_presentados',
    )
    # El reclamo apunta a una publicación o a un usuario.
    publicacion = models.ForeignKey(
        Publicacion, on_delete=models.PROTECT, blank=True, null=True, related_name='reclamos',
    )
    usuario_reportado = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        blank=True,
        null=True,
        related_name='reclamos_recibidos',
    )
    estado = models.ForeignKey(EstadoReclamo, on_delete=models.PROTECT, related_name='reclamos')
    motivo = models.CharField(max_length=30)
    descripcion = models.TextField()
    nota_administrador = models.TextField(blank=True, null=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'reclamo'
        verbose_name = 'reclamo'
        verbose_name_plural = 'reclamos'
        ordering = ['-creado_en']

    def __str__(self):
        return f'Reclamo {self.pk} ({self.motivo})'
