from rest_framework import serializers

from publicaciones.serializers import AnuncianteSerializer, PublicacionResumenSerializer

from .models import Conversacion, Mensaje

LARGO_MAXIMO_MENSAJE = 2000


class IniciarConversacionSerializer(serializers.Serializer):
    publicacion = serializers.IntegerField()


class ConversacionSerializer(serializers.ModelSerializer):
    publicacion = PublicacionResumenSerializer(read_only=True)
    interesado = AnuncianteSerializer(read_only=True)
    anunciante = AnuncianteSerializer(source='publicacion.propietario', read_only=True)
    no_leidos = serializers.IntegerField(read_only=True)

    class Meta:
        model = Conversacion
        fields = ['id', 'publicacion', 'interesado', 'anunciante', 'no_leidos', 'creado_en', 'actualizado_en']
        read_only_fields = fields


class MensajeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mensaje
        fields = ['id', 'autor', 'texto', 'leido', 'enviado_en']
        read_only_fields = ['id', 'autor', 'leido', 'enviado_en']
        extra_kwargs = {'texto': {'max_length': LARGO_MAXIMO_MENSAJE}}
