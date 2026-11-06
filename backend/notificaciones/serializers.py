from rest_framework import serializers

from .models import Notificacion


class NotificacionSerializer(serializers.ModelSerializer):
    tipo = serializers.SlugRelatedField(slug_field='codigo', read_only=True)
    referencia = serializers.SerializerMethodField()

    class Meta:
        model = Notificacion
        fields = ['id', 'mensaje', 'tipo', 'leida', 'referencia', 'creado_en']
        read_only_fields = fields

    def get_referencia(self, notificacion):
        # El frontend arma el enlace a partir del tipo de objeto y su id.
        if notificacion.referencia_tipo_id is None:
            return None
        return {'tipo': notificacion.referencia_tipo.model, 'id': notificacion.referencia_id}
