from django.conf import settings
from django.db import models

from config.borrado_logico import BorradoLogico
from publicaciones.models import Publicacion


class Favorito(BorradoLogico):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='favoritos')
    publicacion = models.ForeignKey(Publicacion, on_delete=models.CASCADE, related_name='favoritos')
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'favorito'
        verbose_name = 'favorito'
        verbose_name_plural = 'favoritos'
        ordering = ['-creado_en']
        constraints = [
            # RF-14: la misma publicación no puede guardarse dos veces para un usuario.
            models.UniqueConstraint(
                fields=['usuario', 'publicacion'],
                condition=models.Q(eliminado_en__isnull=True),
                name='favorito_unico_por_usuario',
            ),
        ]

    def __str__(self):
        return f'Usuario {self.usuario_id} - publicación {self.publicacion_id}'
