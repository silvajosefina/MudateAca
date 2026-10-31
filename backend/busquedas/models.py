from django.conf import settings
from django.db import models

from config.catalogos import Catalogo
from publicaciones.models import Modalidad, Publicacion, TipoInmueble


class EstadoBusqueda(Catalogo):
    class Meta(Catalogo.Meta):
        db_table = 'estado_busqueda'
        verbose_name = 'estado de búsqueda'
        verbose_name_plural = 'estados de búsqueda'


class BusquedaActiva(models.Model):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='busquedas_activas')
    modalidad = models.ForeignKey(
        Modalidad, on_delete=models.PROTECT, blank=True, null=True, related_name='busquedas_activas',
    )
    tipo_inmueble = models.ForeignKey(
        TipoInmueble, on_delete=models.PROTECT, blank=True, null=True, related_name='busquedas_activas',
    )
    estado = models.ForeignKey(EstadoBusqueda, on_delete=models.PROTECT, related_name='busquedas_activas')

    nombre = models.CharField(max_length=100, blank=True, null=True)
    precio_minimo = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    precio_maximo = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    ambientes_minimos = models.PositiveSmallIntegerField(blank=True, null=True)
    dormitorios_minimos = models.PositiveSmallIntegerField(blank=True, null=True)
    ubicacion = models.CharField(max_length=255, blank=True, null=True)

    amueblado = models.BooleanField(blank=True, null=True)
    servicios_incluidos = models.BooleanField(blank=True, null=True)
    acepta_mascotas = models.BooleanField(blank=True, null=True)
    apto_estudiantes = models.BooleanField(blank=True, null=True)

    fecha_ingreso = models.DateField(blank=True, null=True)
    fecha_salida = models.DateField(blank=True, null=True)
    duracion_estadia_dias = models.PositiveSmallIntegerField(blank=True, null=True)

    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'busqueda_activa'
        verbose_name = 'búsqueda activa'
        verbose_name_plural = 'búsquedas activas'
        ordering = ['-actualizado_en']

    def __str__(self):
        return self.nombre or f'Búsqueda {self.pk}'

    def coincidencias_visibles(self):
        return self.coincidencias.filter(publicacion__estado__codigo='activa')


class Coincidencia(models.Model):
    busqueda = models.ForeignKey(BusquedaActiva, on_delete=models.CASCADE, related_name='coincidencias')
    publicacion = models.ForeignKey(Publicacion, on_delete=models.CASCADE, related_name='coincidencias')
    nivel_compatibilidad = models.PositiveSmallIntegerField()
    notificada = models.BooleanField(default=False)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'coincidencia'
        verbose_name = 'coincidencia'
        verbose_name_plural = 'coincidencias'
        ordering = ['-creado_en']
        constraints = [
            models.UniqueConstraint(fields=['busqueda', 'publicacion'], name='coincidencia_unica_por_busqueda'),
        ]

    def __str__(self):
        return f'Búsqueda {self.busqueda_id} - publicación {self.publicacion_id}'
