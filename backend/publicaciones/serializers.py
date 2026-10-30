from decimal import Decimal

from django.contrib.gis.geos import Point
from django.db import transaction
from django.db.models import Max
from rest_framework import serializers

from usuarios.models import Usuario
from usuarios.serializers import UsuarioSerializer

from .estados import ESTADOS_QUE_VUELVEN_A_REVISION
from .models import EstadoPublicacion, EventoModeracion, FotoPublicacion, Modalidad, Publicacion, TipoInmueble
from .moderacion import moderar

# RF-05: toda publicación debe tener al menos tres fotografías.
MINIMO_FOTOS = 3

# La moderación recorre estos textos con expresiones regulares: un tope evita abusos.
LARGO_MAXIMO_TEXTO = 5000

DOCUMENTOS_POR_ROL = {
    'propietario': ('factura_servicio', 'impuesto', 'documentacion_propiedad'),
    'inmobiliaria': ('matricula_corredor', 'constancia_inscripcion', 'poder_representacion'),
}

CAMPOS_PUBLICOS = [
    'id', 'propietario', 'tipo_inmueble', 'modalidad', 'descripcion', 'precio', 'expensas', 'ubicacion',
    'lat', 'lng', 'ambientes', 'dormitorios', 'amueblado', 'servicios_incluidos', 'acepta_mascotas',
    'apto_estudiantes', 'requisitos', 'duracion_minima_dias', 'disponible_desde', 'disponible_hasta',
    'estado', 'fotos', 'creado_en', 'actualizado_en',
]


class FotoPublicacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FotoPublicacion
        fields = ['id', 'imagen', 'orden']


class EventoModeracionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventoModeracion
        fields = ['id', 'tipo', 'nota', 'creado_en']


class AnuncianteSerializer(serializers.ModelSerializer):
    # RF-21 identifica al responsable; el contacto se hace por el chat interno (RF-15).
    rol = serializers.SlugRelatedField(slug_field='codigo', read_only=True)

    class Meta:
        model = Usuario
        fields = ['id', 'nombre', 'apellido', 'razon_social', 'rol']
        read_only_fields = fields


class PublicacionPublicaSerializer(serializers.ModelSerializer):
    # RNF-06: la documentación de verificación nunca sale por acá.
    propietario = AnuncianteSerializer(read_only=True)
    tipo_inmueble = serializers.SlugRelatedField(slug_field='codigo', read_only=True)
    modalidad = serializers.SlugRelatedField(slug_field='codigo', read_only=True)
    estado = serializers.SlugRelatedField(slug_field='codigo', read_only=True)
    fotos = FotoPublicacionSerializer(many=True, read_only=True)
    lat = serializers.SerializerMethodField()
    lng = serializers.SerializerMethodField()

    class Meta:
        model = Publicacion
        fields = CAMPOS_PUBLICOS
        read_only_fields = fields

    def get_lat(self, publicacion):
        return publicacion.coordenadas.y if publicacion.coordenadas is not None else None

    def get_lng(self, publicacion):
        return publicacion.coordenadas.x if publicacion.coordenadas is not None else None


class PublicacionSerializer(PublicacionPublicaSerializer):
    # Vista interna: solo para el anunciante dueño y los administradores.
    propietario = UsuarioSerializer(read_only=True)
    eventos_moderacion = EventoModeracionSerializer(many=True, read_only=True)

    class Meta(PublicacionPublicaSerializer.Meta):
        fields = [
            *CAMPOS_PUBLICOS, 'alquilada_en', 'tipo_documento_verificacion', 'archivo_verificacion',
            'motivo_rechazo_verificacion', 'nota_moderacion', 'eventos_moderacion',
        ]
        read_only_fields = fields


class PublicacionEscrituraSerializer(serializers.ModelSerializer):
    tipo_inmueble = serializers.SlugRelatedField(slug_field='codigo', queryset=TipoInmueble.objects.all())
    modalidad = serializers.SlugRelatedField(slug_field='codigo', queryset=Modalidad.objects.all())
    precio = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal('0.01'),
        error_messages={'min_value': 'Ingresá un precio válido.'},
    )
    expensas = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal('0'), required=False, allow_null=True,
    )
    lat = serializers.FloatField(write_only=True, required=False, allow_null=True, min_value=-90, max_value=90)
    lng = serializers.FloatField(write_only=True, required=False, allow_null=True, min_value=-180, max_value=180)
    fotos = serializers.ListField(child=serializers.ImageField(), write_only=True, required=False)
    fotos_a_eliminar = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)

    class Meta:
        model = Publicacion
        fields = [
            'id', 'tipo_inmueble', 'modalidad', 'descripcion', 'precio', 'expensas', 'ubicacion', 'lat', 'lng',
            'ambientes', 'dormitorios', 'amueblado', 'servicios_incluidos', 'acepta_mascotas', 'apto_estudiantes',
            'requisitos', 'duracion_minima_dias', 'disponible_desde', 'disponible_hasta',
            'tipo_documento_verificacion', 'archivo_verificacion', 'fotos', 'fotos_a_eliminar',
        ]
        extra_kwargs = {
            'descripcion': {'max_length': LARGO_MAXIMO_TEXTO},
            'requisitos': {'max_length': LARGO_MAXIMO_TEXTO},
            'ambientes': {'min_value': 1},
            'duracion_minima_dias': {'min_value': 1},
        }

    def _valor(self, datos, campo):
        # En una edición parcial, lo que no llega conserva el valor guardado.
        return datos[campo] if campo in datos else getattr(self.instance, campo, None)

    def validate_tipo_documento_verificacion(self, tipo):
        rol = self.context['request'].user.rol.codigo
        if tipo not in DOCUMENTOS_POR_ROL.get(rol, ()):
            raise serializers.ValidationError('Este tipo de documentación no corresponde a tu perfil.')
        return tipo

    def _validar_coordenadas(self, datos):
        # Sin lat y lng la publicación queda sin ubicación en el mapa: el campo es opcional.
        if 'lat' not in datos and 'lng' not in datos:
            return
        lat, lng = datos.pop('lat', None), datos.pop('lng', None)
        if (lat is None) != (lng is None):
            raise serializers.ValidationError({'lat': ['Indicá la latitud y la longitud juntas.']})
        datos['coordenadas'] = None if lat is None else Point(lng, lat, srid=4326)

    def _validar_fechas(self, datos):
        desde, hasta = self._valor(datos, 'disponible_desde'), self._valor(datos, 'disponible_hasta')
        if hasta and desde and hasta < desde:
            raise serializers.ValidationError(
                {'disponible_hasta': ['No puede ser anterior a la fecha "disponible desde".']},
            )

    def _validar_duracion(self, datos):
        if self._valor(datos, 'modalidad').codigo != 'temporario':
            datos['duracion_minima_dias'] = None
        elif not self._valor(datos, 'duracion_minima_dias'):
            raise serializers.ValidationError(
                {'duracion_minima_dias': ['Indicá la duración mínima de la estadía.']},
            )

    def _validar_fotos(self, datos):
        actuales = set(self.instance.fotos.values_list('id', flat=True)) if self.instance else set()
        a_eliminar = set(datos.get('fotos_a_eliminar', []))
        if not a_eliminar <= actuales:
            raise serializers.ValidationError(
                {'fotos_a_eliminar': ['Alguna de las fotos no pertenece a esta publicación.']},
            )
        if len(actuales - a_eliminar) + len(datos.get('fotos', [])) < MINIMO_FOTOS:
            raise serializers.ValidationError({'fotos': [f'Subí como mínimo {MINIMO_FOTOS} fotografías.']})

    def validate(self, datos):
        self._validar_coordenadas(datos)
        self._validar_fechas(datos)
        self._validar_duracion(datos)
        self._validar_fotos(datos)
        return datos

    def _agregar_fotos(self, publicacion, fotos):
        ultimo_orden = publicacion.fotos.aggregate(ultimo=Max('orden'))['ultimo']
        siguiente = 0 if ultimo_orden is None else ultimo_orden + 1
        for indice, imagen in enumerate(fotos, start=siguiente):
            FotoPublicacion.objects.create(publicacion=publicacion, imagen=imagen, orden=indice)

    @transaction.atomic
    def create(self, datos_validados):
        fotos = datos_validados.pop('fotos')
        datos_validados.pop('fotos_a_eliminar', None)
        publicacion = Publicacion.objects.create(
            propietario=self.context['request'].user,
            estado=EstadoPublicacion.por_codigo('pendiente_moderacion'),
            **datos_validados,
        )
        self._agregar_fotos(publicacion, fotos)
        moderar(publicacion, requiere_revision=True)
        return publicacion

    @transaction.atomic
    def update(self, publicacion, datos_validados):
        fotos = datos_validados.pop('fotos', [])
        a_eliminar = datos_validados.pop('fotos_a_eliminar', [])
        documento_cambiado = 'archivo_verificacion' in datos_validados or datos_validados.get(
            'tipo_documento_verificacion', publicacion.tipo_documento_verificacion,
        ) != publicacion.tipo_documento_verificacion
        requiere_revision = documento_cambiado or publicacion.estado.codigo in ESTADOS_QUE_VUELVEN_A_REVISION

        publicacion = super().update(publicacion, datos_validados)
        publicacion.fotos.filter(id__in=a_eliminar).delete()
        self._agregar_fotos(publicacion, fotos)
        moderar(publicacion, requiere_revision=requiere_revision)
        return publicacion


class CambioEstadoSerializer(serializers.Serializer):
    estado = serializers.CharField()


class AccionConNotaSerializer(serializers.Serializer):
    nota = serializers.CharField(allow_blank=False)
