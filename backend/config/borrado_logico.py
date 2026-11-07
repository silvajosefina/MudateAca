from django.db import models
from django.utils import timezone


class BorradoLogicoQuerySet(models.QuerySet):
    def eliminar(self):
        return self.update(eliminado_en=timezone.now())


class SinEliminadosManager(models.Manager.from_queryset(BorradoLogicoQuerySet)):
    def get_queryset(self):
        return super().get_queryset().filter(eliminado_en__isnull=True)


class BorradoLogico(models.Model):
    # Los registros nunca se borran de la base: se marcan y dejan de aparecer en las consultas.
    eliminado_en = models.DateTimeField(blank=True, null=True)

    objects = SinEliminadosManager()
    todos = models.Manager.from_queryset(BorradoLogicoQuerySet)()

    class Meta:
        abstract = True

    def eliminar(self):
        self.eliminado_en = timezone.now()
        self.save(update_fields=['eliminado_en'])
