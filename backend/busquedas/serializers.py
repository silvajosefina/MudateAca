from decimal import Decimal

from rest_framework import serializers

from config.texto import normalizar_texto
from publicaciones.models import Modalidad, TipoInmueble
from publicaciones.serializers import PublicacionPublicaSerializer

from .models import BusquedaActiva, Coincidencia

CRITERIOS = [
    'modalidad', 'tipo_inmueble', 'precio_minimo', 'precio_maximo', 'ambientes_minimos', 'dormitorios_minimos',
    'ubicacion', 'amueblado', 'servicios_incluidos', 'acepta_mascotas', 'apto_estudiantes',
    'fecha_ingreso', 'fecha_salida', 'duracion_estadia_dias',
]
CRITERIOS_DE_ESTADIA = ['fecha_ingreso', 'fecha_salida', 'duracion_estadia_dias']


class BusquedaActivaSerializer(serializers.ModelSerializer):
    modalidad = serializers.SlugRelatedField(
        slug_field='codigo', queryset=Modalidad.objects.all(), required=False, allow_null=True,
    )
    tipo_inmueble = serializers.SlugRelatedField(
        slug_field='codigo', queryset=TipoInmueble.objects.all(), required=False, allow_null=True,
    )
    estado = serializers.SlugRelatedField(slug_field='codigo', read_only=True)
    cantidad_coincidencias = serializers.SerializerMethodField()

    class Meta:
        model = BusquedaActiva
        fields = ['id', 'nombre', *CRITERIOS, 'estado', 'cantidad_coincidencias', 'creado_en', 'actualizado_en']
        extra_kwargs = {
            'precio_minimo': {'min_value': Decimal('0')},
            'precio_maximo': {'min_value': Decimal('0')},
        }

    def get_cantidad_coincidencias(self, busqueda):
        return busqueda.coincidencias_visibles().count()

    def _criterios_finales(self, datos):
        # 0, '' y false significan "sin preferencia", que en el DER se guarda como NULL.
        for campo in CRITERIOS:
            if campo in datos and not datos[campo]:
                datos[campo] = None

        criterios = {
            campo: datos[campo] if campo in datos else getattr(self.instance, campo, None)
            for campo in CRITERIOS
        }
        if criterios['modalidad'] and criterios['modalidad'].codigo == 'residencial':
            for campo in CRITERIOS_DE_ESTADIA:
                datos[campo] = criterios[campo] = None
        return criterios

    def _es_duplicada(self, criterios):
        clave = [self._comparable(criterios[campo]) for campo in CRITERIOS]
        propias = BusquedaActiva.objects.filter(usuario=self.context['request'].user)
        if self.instance:
            propias = propias.exclude(id=self.instance.id)
        return any(
            clave == [self._comparable(getattr(busqueda, campo)) for campo in CRITERIOS]
            for busqueda in propias.select_related('modalidad', 'tipo_inmueble')
        )

    def _comparable(self, valor):
        return normalizar_texto(valor) if isinstance(valor, str) else valor

    def validate(self, datos):
        if 'nombre' in datos:
            datos['nombre'] = datos['nombre'] or None

        criterios = self._criterios_finales(datos)
        if not any(criterios.values()):
            raise serializers.ValidationError('Completá al menos un criterio de búsqueda.')

        minimo, maximo = criterios['precio_minimo'], criterios['precio_maximo']
        if minimo and maximo and minimo > maximo:
            raise serializers.ValidationError({'precio_minimo': ['No puede ser mayor que el precio máximo.']})

        ingreso, salida = criterios['fecha_ingreso'], criterios['fecha_salida']
        if ingreso and salida and salida <= ingreso:
            raise serializers.ValidationError({'fecha_salida': ['Debe ser posterior a la fecha de ingreso.']})

        if self._es_duplicada(criterios):
            raise serializers.ValidationError('Ya tenés una búsqueda guardada con exactamente estos mismos filtros.')
        return datos


class CambioEstadoBusquedaSerializer(serializers.Serializer):
    estado = serializers.CharField()


class CoincidenciaSerializer(serializers.ModelSerializer):
    publicacion = PublicacionPublicaSerializer(read_only=True)

    class Meta:
        model = Coincidencia
        fields = ['id', 'nivel_compatibilidad', 'publicacion', 'creado_en']
        read_only_fields = fields
