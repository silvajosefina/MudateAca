from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from usuarios.permissions import EsAdministrador

from .models import EstadoPublicacion, EventoModeracion, Publicacion
from .permissions import EsPropietarioOInmobiliaria
from .serializers import AccionConNotaSerializer, PublicacionCrearSerializer, PublicacionSerializer


class PublicacionCrearView(generics.CreateAPIView):
    serializer_class = PublicacionCrearSerializer
    permission_classes = [EsPropietarioOInmobiliaria]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        publicacion = serializer.save()
        return Response(PublicacionSerializer(publicacion).data, status=201)


class PublicacionDetalleView(generics.RetrieveAPIView):
    serializer_class = PublicacionSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        publicacion = generics.get_object_or_404(Publicacion, id=self.kwargs['id'])
        usuario = self.request.user
        if not usuario.es_administrador and publicacion.propietario_id != usuario.id:
            self.permission_denied(self.request)
        return publicacion


class PublicacionPendientesListView(generics.ListAPIView):
    serializer_class = PublicacionSerializer
    permission_classes = [EsAdministrador]

    def get_queryset(self):
        return Publicacion.objects.filter(estado__codigo='pendiente_moderacion').order_by('creado_en')


class PublicacionAprobarView(APIView):
    permission_classes = [EsAdministrador]

    def post(self, request, id, *args, **kwargs):
        publicacion = generics.get_object_or_404(Publicacion, id=id)
        publicacion.estado = EstadoPublicacion.por_codigo('activa')
        publicacion.save(update_fields=['estado', 'actualizado_en'])
        return Response(PublicacionSerializer(publicacion).data)


class PublicacionRechazarView(APIView):
    permission_classes = [EsAdministrador]

    def post(self, request, id, *args, **kwargs):
        publicacion = generics.get_object_or_404(Publicacion, id=id)
        serializer = AccionConNotaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        nota = serializer.validated_data['nota']

        publicacion.estado = EstadoPublicacion.por_codigo('rechazada')
        publicacion.save(update_fields=['estado', 'actualizado_en'])
        EventoModeracion.objects.create(
            publicacion=publicacion, administrador=request.user, tipo='rechazo', nota=nota,
        )
        return Response(PublicacionSerializer(publicacion).data)


class PublicacionSolicitarModificacionesView(APIView):
    permission_classes = [EsAdministrador]

    def post(self, request, id, *args, **kwargs):
        publicacion = generics.get_object_or_404(Publicacion, id=id)
        serializer = AccionConNotaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        nota = serializer.validated_data['nota']

        publicacion.estado = EstadoPublicacion.por_codigo('observada')
        publicacion.save(update_fields=['estado', 'actualizado_en'])
        EventoModeracion.objects.create(
            publicacion=publicacion, administrador=request.user, tipo='solicitud_modificacion', nota=nota,
        )
        return Response(PublicacionSerializer(publicacion).data)
