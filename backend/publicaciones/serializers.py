from rest_framework import serializers

from usuarios.serializers import UsuarioSerializer

from .models import EstadoPublicacion, EventoModeracion, FotoPublicacion, Modalidad, Publicacion, TipoInmueble

# RF-05: toda publicación debe tener al menos tres fotografías.
MINIMO_FOTOS = 3


class FotoPublicacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FotoPublicacion
        fields = ['id', 'imagen', 'orden']


class EventoModeracionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventoModeracion
        fields = ['id', 'tipo', 'nota', 'creado_en']


class PublicacionCrearSerializer(serializers.ModelSerializer):
    tipo_inmueble = serializers.SlugRelatedField(slug_field='codigo', queryset=TipoInmueble.objects.all())
    modalidad = serializers.SlugRelatedField(slug_field='codigo', queryset=Modalidad.objects.all())
    fotos = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        min_length=MINIMO_FOTOS,
        error_messages={'min_length': f'Subí como mínimo {MINIMO_FOTOS} fotografías.'},
    )

    class Meta:
        model = Publicacion
        fields = [
            'id', 'tipo_inmueble', 'modalidad', 'descripcion', 'precio', 'ubicacion',
            'ambientes', 'dormitorios', 'disponible_desde',
            'tipo_documento_verificacion', 'archivo_verificacion', 'fotos',
        ]

    def create(self, datos_validados):
        fotos = datos_validados.pop('fotos')
        propietario = self.context['request'].user
        estado = EstadoPublicacion.por_codigo('pendiente_moderacion')
        publicacion = Publicacion.objects.create(propietario=propietario, estado=estado, **datos_validados)
        for indice, imagen in enumerate(fotos):
            FotoPublicacion.objects.create(publicacion=publicacion, imagen=imagen, orden=indice)
        return publicacion


class PublicacionSerializer(serializers.ModelSerializer):
    propietario = UsuarioSerializer(read_only=True)
    tipo_inmueble = serializers.SlugRelatedField(slug_field='codigo', read_only=True)
    modalidad = serializers.SlugRelatedField(slug_field='codigo', read_only=True)
    estado = serializers.SlugRelatedField(slug_field='codigo', read_only=True)
    fotos = FotoPublicacionSerializer(many=True, read_only=True)
    eventos_moderacion = EventoModeracionSerializer(many=True, read_only=True)

    class Meta:
        model = Publicacion
        fields = [
            'id', 'propietario', 'tipo_inmueble', 'modalidad', 'descripcion', 'precio', 'ubicacion',
            'ambientes', 'dormitorios', 'disponible_desde', 'estado',
            'tipo_documento_verificacion', 'archivo_verificacion',
            'motivo_rechazo_verificacion', 'nota_moderacion',
            'fotos', 'eventos_moderacion', 'creado_en', 'actualizado_en',
        ]
        read_only_fields = fields


class AccionConNotaSerializer(serializers.Serializer):
    nota = serializers.CharField(allow_blank=False)
