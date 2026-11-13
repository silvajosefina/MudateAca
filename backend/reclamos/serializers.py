from rest_framework import serializers

from config.campos import CodigoDeCatalogo
from publicaciones.models import Publicacion
from publicaciones.serializers import AnuncianteSerializer, PublicacionResumenSerializer
from usuarios.models import Usuario

from .models import EstadoReclamo, Reclamo

# Motivos de las pantallas del frontend.
MOTIVOS_POR_OBJETIVO = {
    'publicacion': ('enganosa', 'duplicada', 'no_existe', 'datos_falsos', 'otro'),
    'usuario': ('conducta_inapropiada', 'no_se_presento', 'posible_estafa', 'otro'),
}
ESTADOS_ABIERTOS = ('pendiente', 'en_revision')
LARGO_MAXIMO_DESCRIPCION = 2000


class CrearReclamoSerializer(serializers.Serializer):
    # Los mensajes por defecto hablan de "clave primaria" y tipos de Python.
    publicacion = serializers.PrimaryKeyRelatedField(
        queryset=Publicacion.objects.all(),
        required=False,
        allow_null=True,
        error_messages={'does_not_exist': 'La publicación no existe.', 'incorrect_type': 'La publicación no existe.'},
    )
    usuario_reportado = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.all(),
        required=False,
        allow_null=True,
        error_messages={'does_not_exist': 'El usuario no existe.', 'incorrect_type': 'El usuario no existe.'},
    )
    motivo = serializers.CharField()
    descripcion = serializers.CharField(max_length=LARGO_MAXIMO_DESCRIPCION)

    def validate(self, datos):
        reclamante = self.context['request'].user
        publicacion, usuario = datos.get('publicacion'), datos.get('usuario_reportado')

        if bool(publicacion) == bool(usuario):
            raise serializers.ValidationError('Indicá una publicación o un usuario, no ambos.')
        if publicacion and publicacion.propietario_id == reclamante.id:
            raise serializers.ValidationError({'publicacion': ['No podés reportar tu propia publicación.']})
        if usuario and (usuario.id == reclamante.id or usuario.es_administrador):
            raise serializers.ValidationError({'usuario_reportado': ['No podés reportar a este usuario.']})

        objetivo = 'publicacion' if publicacion else 'usuario'
        if datos['motivo'] not in MOTIVOS_POR_OBJETIVO[objetivo]:
            raise serializers.ValidationError({'motivo': ['Elegí un motivo válido.']})

        abiertos = Reclamo.objects.filter(
            reclamante=reclamante, estado__codigo__in=ESTADOS_ABIERTOS,
            publicacion=publicacion, usuario_reportado=usuario,
        )
        if abiertos.exists():
            raise serializers.ValidationError('Ya tenés un reclamo pendiente sobre esto. Esperá a que se resuelva.')
        return datos


class ReclamoSerializer(serializers.ModelSerializer):
    reclamante = AnuncianteSerializer(read_only=True)
    publicacion = PublicacionResumenSerializer(read_only=True)
    usuario_reportado = AnuncianteSerializer(read_only=True)
    objetivo = serializers.SerializerMethodField()
    estado = serializers.SlugRelatedField(slug_field='codigo', read_only=True)

    class Meta:
        model = Reclamo
        fields = [
            'id', 'objetivo', 'reclamante', 'publicacion', 'usuario_reportado', 'motivo', 'descripcion',
            'estado', 'nota_administrador', 'creado_en', 'actualizado_en',
        ]
        read_only_fields = fields

    def get_objetivo(self, reclamo):
        return 'publicacion' if reclamo.publicacion_id else 'usuario'


class FiltroReclamosSerializer(serializers.Serializer):
    estado = CodigoDeCatalogo(queryset=EstadoReclamo.objects.all(), required=False, allow_null=True)


class CambioEstadoReclamoSerializer(serializers.Serializer):
    estado = serializers.CharField()
    nota_administrador = serializers.CharField(required=False, allow_blank=True, max_length=LARGO_MAXIMO_DESCRIPCION)
