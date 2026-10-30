from django.db import models


class Catalogo(models.Model):
    # Tablas de referencia del DER: un código estable para el sistema y un nombre legible.
    codigo = models.CharField(max_length=30, unique=True)
    nombre = models.CharField(max_length=50)

    class Meta:
        abstract = True
        ordering = ['id']

    def __str__(self):
        return self.nombre

    @classmethod
    def por_codigo(cls, codigo):
        return cls.objects.get(codigo=codigo)
