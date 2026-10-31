from django.db import transaction
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from publicaciones.estados import ESTADOS_QUE_ADMITEN_CONTACTO
from publicaciones.models import Publicacion
from usuarios.permissions import EsInteresado

from .models import Conversacion
from .serializers import ConversacionSerializer, IniciarConversacionSerializer, MensajeSerializer


def conversaciones_del_usuario(usuario):
    # Solo los dos participantes acceden al chat; para el resto la conversación no existe.
    return (
        Conversacion.objects.filter(Q(interesado=usuario) | Q(publicacion__propietario=usuario))
        .select_related('interesado__rol', 'publicacion__propietario__rol', 'publicacion__estado')
        .prefetch_related('publicacion__fotos')
    )


class ConversacionListaCrearView(generics.ListAPIView):
    serializer_class = ConversacionSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [EsInteresado()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return conversaciones_del_usuario(self.request.user)

    def post(self, request, *args, **kwargs):
        serializer = IniciarConversacionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        publicacion = generics.get_object_or_404(
            Publicacion.objects.select_related('estado'), id=serializer.validated_data['publicacion'],
        )

        existente = Conversacion.objects.filter(publicacion=publicacion, interesado=request.user).first()
        if existente is None and publicacion.estado.codigo not in ESTADOS_QUE_ADMITEN_CONTACTO:
            raise ValidationError({'publicacion': ['Esta publicación no admite nuevas consultas.']})

        conversacion, creada = Conversacion.objects.get_or_create(publicacion=publicacion, interesado=request.user)
        conversacion = conversaciones_del_usuario(request.user).get(id=conversacion.id)
        return Response(
            self.get_serializer(conversacion).data,
            status=status.HTTP_201_CREATED if creada else status.HTTP_200_OK,
        )


class ConversacionDetalleView(generics.RetrieveAPIView):
    serializer_class = ConversacionSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        return conversaciones_del_usuario(self.request.user)


class MensajeListaCrearView(generics.ListCreateAPIView):
    serializer_class = MensajeSerializer
    permission_classes = [IsAuthenticated]

    def _conversacion(self):
        return generics.get_object_or_404(conversaciones_del_usuario(self.request.user), id=self.kwargs['id'])

    def get_queryset(self):
        return self._conversacion().mensajes.order_by('enviado_en', 'id')

    @transaction.atomic
    def perform_create(self, serializer):
        conversacion = self._conversacion()
        serializer.save(conversacion=conversacion, autor=self.request.user)
        conversacion.save(update_fields=['actualizado_en'])
