from django.conf import settings
from django.contrib.gis.db import models
from django.core.validators import FileExtensionValidator

from config.catalogos import Catalogo

TIPOS_DOCUMENTO_VERIFICACION = [
    ('factura_servicio', 'Factura de un servicio asociada al domicilio'),
    ('impuesto', 'Impuesto correspondiente al inmueble'),
    ('documentacion_propiedad', 'Documentación de propiedad'),
    ('matricula_corredor', 'Matrícula de corredor/a inmobiliario/a'),
    ('constancia_inscripcion', 'Constancia de inscripción o CUIT de la inmobiliaria'),
    ('poder_representacion', 'Poder o autorización de representación del propietario'),
]

# RF-04: formatos admitidos para la documentación de verificación.
EXTENSIONES_VERIFICACION = ['pdf', 'jpg', 'jpeg', 'png']

TIPOS_EVENTO_MODERACION = [
    ('rechazo', 'Rechazada'),
    ('solicitud_modificacion', 'Modificaciones solicitadas'),
    ('moderacion_automatica', 'Observada por la moderación automática'),
]


class EstadoPublicacion(Catalogo):
    class Meta(Catalogo.Meta):
        db_table = 'estado_publicacion'
        verbose_name = 'estado de publicación'
        verbose_name_plural = 'estados de publicación'


class TipoInmueble(Catalogo):
    class Meta(Catalogo.Meta):
        db_table = 'tipo_inmueble'
        verbose_name = 'tipo de inmueble'
        verbose_name_plural = 'tipos de inmueble'


class Modalidad(Catalogo):
    class Meta(Catalogo.Meta):
        db_table = 'modalidad'
        verbose_name = 'modalidad'
        verbose_name_plural = 'modalidades'


class Publicacion(models.Model):
    # PROTECT: RF-09 conserva las publicaciones para historial, auditoría y seguridad.
    propietario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='publicaciones',
    )
    tipo_inmueble = models.ForeignKey(TipoInmueble, on_delete=models.PROTECT, related_name='publicaciones')
    modalidad = models.ForeignKey(Modalidad, on_delete=models.PROTECT, related_name='publicaciones')
    estado = models.ForeignKey(EstadoPublicacion, on_delete=models.PROTECT, related_name='publicaciones')

    descripcion = models.TextField()
    precio = models.DecimalField(max_digits=12, decimal_places=2)
    expensas = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    ubicacion = models.CharField(max_length=255)
    coordenadas = models.PointField(geography=True, srid=4326, blank=True, null=True)
    ambientes = models.PositiveSmallIntegerField()
    dormitorios = models.PositiveSmallIntegerField()

    amueblado = models.BooleanField(default=False)
    servicios_incluidos = models.BooleanField(default=False)
    acepta_mascotas = models.BooleanField(default=False)
    apto_estudiantes = models.BooleanField(default=False)
    requisitos = models.TextField(blank=True, null=True)
    duracion_minima_dias = models.PositiveSmallIntegerField(blank=True, null=True)

    disponible_desde = models.DateField()
    disponible_hasta = models.DateField(blank=True, null=True)
    alquilada_en = models.DateTimeField(blank=True, null=True)

    tipo_documento_verificacion = models.CharField(max_length=30, choices=TIPOS_DOCUMENTO_VERIFICACION)
    archivo_verificacion = models.FileField(
        upload_to='verificaciones/',
        max_length=255,
        db_column='archivo_verificacion_url',
        validators=[FileExtensionValidator(allowed_extensions=EXTENSIONES_VERIFICACION)],
    )

    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'publicacion'
        verbose_name = 'publicación'
        verbose_name_plural = 'publicaciones'
        ordering = ['-actualizado_en']

    def __str__(self):
        return f'{self.descripcion[:40]} ({self.propietario.correo})'

    def _nota_del_ultimo_evento(self, *tipos):
        # Recorre .all() para aprovechar el prefetch de los listados.
        for evento in self.eventos_moderacion.all():
            if evento.tipo in tipos:
                return evento.nota
        return None

    @property
    def motivo_rechazo_verificacion(self):
        if self.estado.codigo != 'rechazada':
            return None
        return self._nota_del_ultimo_evento('rechazo')

    @property
    def nota_moderacion(self):
        if self.estado.codigo != 'observada':
            return None
        return self._nota_del_ultimo_evento('solicitud_modificacion', 'moderacion_automatica')


class FotoPublicacion(models.Model):
    publicacion = models.ForeignKey(Publicacion, on_delete=models.CASCADE, related_name='fotos')
    imagen = models.ImageField(upload_to='publicaciones/', max_length=255, db_column='imagen_url')
    orden = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = 'foto_publicacion'
        verbose_name = 'foto de publicación'
        verbose_name_plural = 'fotos de publicación'
        ordering = ['orden']


class EventoModeracion(models.Model):
    # Cada rechazo o solicitud de cambios agrega un registro nuevo, nunca pisa el anterior.
    publicacion = models.ForeignKey(Publicacion, on_delete=models.CASCADE, related_name='eventos_moderacion')
    # Vacío cuando el evento lo generó la moderación automática.
    administrador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='eventos_moderacion',
    )
    tipo = models.CharField(max_length=30, choices=TIPOS_EVENTO_MODERACION)
    nota = models.TextField()
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'evento_moderacion'
        verbose_name = 'evento de moderación'
        verbose_name_plural = 'eventos de moderación'
        ordering = ['-creado_en']

    def __str__(self):
        return f'{self.get_tipo_display()} - {self.publicacion_id}'
