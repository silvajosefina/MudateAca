from decimal import Decimal

from django.db.models import Q
from rest_framework import serializers

from .models import EstadoPublicacion, Modalidad, TipoInmueble

CARACTERISTICAS = ('amueblado', 'servicios_incluidos', 'acepta_mascotas', 'apto_estudiantes')


def dias_de_estadia(fecha_ingreso, fecha_salida, duracion_estadia):
    if duracion_estadia:
        return duracion_estadia
    if fecha_ingreso and fecha_salida:
        return (fecha_salida - fecha_ingreso).days
    return None


def cubre_estadia(publicacion, fecha_ingreso, fecha_salida, duracion_estadia):
    inicio, fin = fecha_ingreso or fecha_salida, fecha_salida or fecha_ingreso
    if inicio and publicacion.disponible_desde > inicio:
        return False
    if fin and publicacion.disponible_hasta and publicacion.disponible_hasta < fin:
        return False
    estadia = dias_de_estadia(fecha_ingreso, fecha_salida, duracion_estadia)
    minimo = publicacion.duracion_minima_dias
    return estadia is None or minimo is None or minimo <= estadia


def condicion_de_estadia(fecha_ingreso, fecha_salida, duracion_estadia):
    # Misma regla que cubre_estadia, expresada como consulta para poder paginar en la base.
    condicion = Q()
    inicio, fin = fecha_ingreso or fecha_salida, fecha_salida or fecha_ingreso
    if inicio:
        condicion &= Q(disponible_desde__lte=inicio)
    if fin:
        condicion &= Q(disponible_hasta__isnull=True) | Q(disponible_hasta__gte=fin)
    estadia = dias_de_estadia(fecha_ingreso, fecha_salida, duracion_estadia)
    if estadia is not None:
        condicion &= Q(duracion_minima_dias__isnull=True) | Q(duracion_minima_dias__lte=estadia)
    return condicion


class FiltrosPublicacionesSerializer(serializers.Serializer):
    modalidad = serializers.SlugRelatedField(
        slug_field='codigo', queryset=Modalidad.objects.all(), required=False, allow_null=True,
    )
    tipo_inmueble = serializers.SlugRelatedField(
        slug_field='codigo', queryset=TipoInmueble.objects.all(), required=False, allow_null=True,
    )
    ubicacion = serializers.CharField(required=False, allow_blank=True, max_length=255)
    precio_min = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0'), required=False)
    precio_max = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0'), required=False)
    ambientes_min = serializers.IntegerField(min_value=0, required=False)
    dormitorios_min = serializers.IntegerField(min_value=0, required=False)
    amueblado = serializers.BooleanField(required=False)
    servicios_incluidos = serializers.BooleanField(required=False)
    acepta_mascotas = serializers.BooleanField(required=False)
    apto_estudiantes = serializers.BooleanField(required=False)
    fecha_ingreso = serializers.DateField(required=False)
    fecha_salida = serializers.DateField(required=False)
    duracion_estadia = serializers.IntegerField(min_value=1, required=False)

    def validate(self, datos):
        precio_min, precio_max = datos.get('precio_min'), datos.get('precio_max')
        if precio_min and precio_max and precio_min > precio_max:
            raise serializers.ValidationError({'precio_min': ['No puede ser mayor que el precio máximo.']})
        ingreso, salida = datos.get('fecha_ingreso'), datos.get('fecha_salida')
        if ingreso and salida and salida <= ingreso:
            raise serializers.ValidationError({'fecha_salida': ['Debe ser posterior a la fecha de ingreso.']})
        return datos


class FiltroMisPublicacionesSerializer(serializers.Serializer):
    estado = serializers.SlugRelatedField(
        slug_field='codigo', queryset=EstadoPublicacion.objects.all(), required=False, allow_null=True,
    )


def aplicar_filtros(publicaciones, filtros):
    if filtros.get('modalidad'):
        publicaciones = publicaciones.filter(modalidad=filtros['modalidad'])
    if filtros.get('tipo_inmueble'):
        publicaciones = publicaciones.filter(tipo_inmueble=filtros['tipo_inmueble'])
    if filtros.get('ubicacion'):
        publicaciones = publicaciones.filter(ubicacion__unaccent__icontains=filtros['ubicacion'])
    if filtros.get('precio_min'):
        publicaciones = publicaciones.filter(precio__gte=filtros['precio_min'])
    if filtros.get('precio_max'):
        publicaciones = publicaciones.filter(precio__lte=filtros['precio_max'])
    if filtros.get('ambientes_min'):
        publicaciones = publicaciones.filter(ambientes__gte=filtros['ambientes_min'])
    if filtros.get('dormitorios_min'):
        publicaciones = publicaciones.filter(dormitorios__gte=filtros['dormitorios_min'])
    for caracteristica in CARACTERISTICAS:
        if filtros.get(caracteristica):
            publicaciones = publicaciones.filter(**{caracteristica: True})

    ingreso, salida, duracion = (
        filtros.get('fecha_ingreso'), filtros.get('fecha_salida'), filtros.get('duracion_estadia'),
    )
    if ingreso or salida or duracion:
        # RF-11: las fechas solo aplican a los alquileres temporarios.
        publicaciones = publicaciones.filter(
            Q(modalidad__codigo='residencial') | condicion_de_estadia(ingreso, salida, duracion),
        )
    return publicaciones
