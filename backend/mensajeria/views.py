from django.db import transaction
from django.db.models import Count, Q
from rest_framework import generics, serializers, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from publicaciones.estados import ESTADOS_QUE_ADMITEN_CONTACTO
from publicaciones.models import Publicacion
from usuarios.permissions import EsInteresado

from .models import Conversacion, Mensaje
from .serializers import ConversacionSerializer, IniciarConversacionSerializer, MensajeSerializer


def conversaciones_del_usuario(usuario):
    # Solo los dos participantes acceden al chat; para el resto la conversación no existe.
    return (
        Conversacion.objects.filter(Q(interesado=usuario) | Q(publicacion__propietario=usuario))
        .annotate(no_leidos=Count('mensajes', filter=Q(mensajes__leido=False) & ~Q(mensajes__autor=usuario)))
        .select_related('interesado__rol', 'publicacion__propietario__rol', 'publicacion__estado')
        .prefetch_related('publicacion__fotos')
        # Con una agregación Django ignora el orden del Meta, por eso se indica acá.
        .order_by('-actualizado_en', '-id')
    )


def mensajes_no_leidos_de(usuario):
    return Mensaje.objects.filter(
        Q(conversacion__interesado=usuario) | Q(conversacion__publicacion__propietario=usuario),
        leido=False,
    ).exclude(autor=usuario)


class ParametrosPollingSerializer(serializers.Serializer):
    despues_de = serializers.IntegerField(min_value=0, required=False)


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
        publicacion = Publicacion.objects.select_related('estado').filter(
            id=serializer.validated_data['publicacion'],
        ).first()
        if publicacion is None:
            raise NotFound('La publicación no existe.')

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
        # Polling: con despues_de, el cliente recibe solo los mensajes que todavía no tiene.
        parametros = ParametrosPollingSerializer(data=self.request.query_params)
        parametros.is_valid(raise_exception=True)
        mensajes = self._conversacion().mensajes.order_by('enviado_en', 'id')
        despues_de = parametros.validated_data.get('despues_de')
        return mensajes.filter(id__gt=despues_de) if despues_de is not None else mensajes

    @transaction.atomic
    def perform_create(self, serializer):
        conversacion = self._conversacion()
        serializer.save(conversacion=conversacion, autor=self.request.user)
        conversacion.save(update_fields=['actualizado_en'])


class MarcarConversacionLeidaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id, *args, **kwargs):
        conversacion = generics.get_object_or_404(conversaciones_del_usuario(request.user), id=id)
        marcados = conversacion.mensajes.filter(leido=False).exclude(autor=request.user).update(leido=True)
        return Response({'marcados': marcados})


class MensajesNoLeidosView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response({'cantidad': mensajes_no_leidos_de(request.user).count()})
