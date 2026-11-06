from rest_framework import serializers

from publicaciones.estados import ESTADOS_DETALLE_PUBLICO
from publicaciones.serializers import PublicacionPublicaSerializer

from .models import Favorito


class AgregarFavoritoSerializer(serializers.Serializer):
    publicacion = serializers.IntegerField()


class FavoritoSerializer(serializers.ModelSerializer):
    disponible = serializers.SerializerMethodField()
    publicacion = serializers.SerializerMethodField()

    class Meta:
        model = Favorito
        fields = ['id', 'disponible', 'publicacion', 'creado_en']
        read_only_fields = fields

    def get_disponible(self, favorito):
        return favorito.publicacion.estado.codigo in ESTADOS_DETALLE_PUBLICO

    def get_publicacion(self, favorito):
        # Si dejó de ser pública solo se informa su estado, sin exponer el resto de los datos.
        if not self.get_disponible(favorito):
            return {'id': favorito.publicacion_id, 'estado': favorito.publicacion.estado.codigo}
        return PublicacionPublicaSerializer(favorito.publicacion, context=self.context).data
