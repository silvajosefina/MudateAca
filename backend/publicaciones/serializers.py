from rest_framework import serializers

from usuarios.serializers import UsuarioSerializer

from .models import EventoModeracion, FotoPublicacion, Publicacion


class FotoPublicacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FotoPublicacion
        fields = ['id', 'imagen', 'orden']


class EventoModeracionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventoModeracion
        fields = ['id', 'tipo', 'nota', 'creado_en']


class PublicacionCrearSerializer(serializers.ModelSerializer):
    fotos = serializers.ListField(child=serializers.ImageField(), write_only=True, min_length=1)

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
        publicacion = Publicacion.objects.create(propietario=propietario, **datos_validados)
        for indice, imagen in enumerate(fotos):
            FotoPublicacion.objects.create(publicacion=publicacion, imagen=imagen, orden=indice)
        return publicacion


class PublicacionSerializer(serializers.ModelSerializer):
    propietario = UsuarioSerializer(read_only=True)
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
