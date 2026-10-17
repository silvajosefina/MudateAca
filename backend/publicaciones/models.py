from django.conf import settings
from django.db import models

TIPOS_INMUEBLE = [
    ('casa', 'Casa'),
    ('departamento', 'Departamento'),
    ('habitacion', 'Habitación'),
    ('residencia', 'Residencia'),
]

MODALIDADES_ALQUILER = [
    ('residencial', 'Residencial'),
    ('temporario', 'Temporario'),
]

ESTADOS_PUBLICACION = [
    ('pendiente_moderacion', 'Pendiente de moderación'),
    ('activa', 'Activa'),
    ('pausada', 'Pausada'),
    ('observada', 'Observada'),
    ('reservada', 'Reservada'),
    ('rechazada', 'Rechazada'),
    ('alquilada', 'Alquilada'),
    ('archivada', 'Archivada'),
    ('eliminada', 'Eliminada'),
]

TIPOS_DOCUMENTO_VERIFICACION = [
    ('factura_servicio', 'Factura de un servicio asociada al domicilio'),
    ('impuesto', 'Impuesto correspondiente al inmueble'),
    ('documentacion_propiedad', 'Documentación de propiedad'),
    ('matricula_corredor', 'Matrícula de corredor/a inmobiliario/a'),
    ('constancia_inscripcion', 'Constancia de inscripción o CUIT de la inmobiliaria'),
    ('poder_representacion', 'Poder o autorización de representación del propietario'),
]

TIPOS_EVENTO_MODERACION = [
    ('rechazo', 'Rechazada'),
    ('solicitud_modificacion', 'Modificaciones solicitadas'),
]


class Publicacion(models.Model):
    propietario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='publicaciones',
    )

    tipo_inmueble = models.CharField(max_length=20, choices=TIPOS_INMUEBLE)
    modalidad = models.CharField(max_length=20, choices=MODALIDADES_ALQUILER)
    descripcion = models.TextField()
    precio = models.DecimalField(max_digits=12, decimal_places=2)
    ubicacion = models.CharField(max_length=255)
    ambientes = models.PositiveSmallIntegerField()
    dormitorios = models.PositiveSmallIntegerField()
    disponible_desde = models.DateField()

    estado = models.CharField(max_length=25, choices=ESTADOS_PUBLICACION, default='pendiente_moderacion')

    tipo_documento_verificacion = models.CharField(max_length=30, choices=TIPOS_DOCUMENTO_VERIFICACION)
    archivo_verificacion = models.FileField(upload_to='verificaciones/')
    motivo_rechazo_verificacion = models.TextField(blank=True, null=True)
    nota_moderacion = models.TextField(blank=True, null=True)

    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'publicación'
        verbose_name_plural = 'publicaciones'
        ordering = ['-actualizado_en']

    def __str__(self):
        return f'{self.descripcion[:40]} ({self.propietario.correo})'


class FotoPublicacion(models.Model):
    publicacion = models.ForeignKey(Publicacion, on_delete=models.CASCADE, related_name='fotos')
    imagen = models.ImageField(upload_to='publicaciones/')
    orden = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name = 'foto de publicación'
        verbose_name_plural = 'fotos de publicación'
        ordering = ['orden']


class EventoModeracion(models.Model):
    # Cada rechazo o solicitud de cambios agrega un registro nuevo, nunca pisa el anterior.
    publicacion = models.ForeignKey(Publicacion, on_delete=models.CASCADE, related_name='eventos_moderacion')
    tipo = models.CharField(max_length=30, choices=TIPOS_EVENTO_MODERACION)
    nota = models.TextField()
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'evento de moderación'
        verbose_name_plural = 'eventos de moderación'
        ordering = ['-creado_en']

    def __str__(self):
        return f'{self.get_tipo_display()} - {self.publicacion_id}'
