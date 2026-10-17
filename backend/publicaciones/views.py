from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from usuarios.permissions import EsAdministrador

from .models import EventoModeracion, Publicacion
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
        if usuario.rol != 'administrador' and publicacion.propietario_id != usuario.id:
            self.permission_denied(self.request)
        return publicacion


class PublicacionPendientesListView(generics.ListAPIView):
    serializer_class = PublicacionSerializer
    permission_classes = [EsAdministrador]

    def get_queryset(self):
        return Publicacion.objects.filter(estado='pendiente_moderacion').order_by('creado_en')


class PublicacionAprobarView(APIView):
    permission_classes = [EsAdministrador]

    def post(self, request, id, *args, **kwargs):
        publicacion = generics.get_object_or_404(Publicacion, id=id)
        publicacion.estado = 'activa'
        publicacion.motivo_rechazo_verificacion = None
        publicacion.nota_moderacion = None
        publicacion.save(update_fields=['estado', 'motivo_rechazo_verificacion', 'nota_moderacion', 'actualizado_en'])
        return Response(PublicacionSerializer(publicacion).data)


class PublicacionRechazarView(APIView):
    permission_classes = [EsAdministrador]

    def post(self, request, id, *args, **kwargs):
        publicacion = generics.get_object_or_404(Publicacion, id=id)
        serializer = AccionConNotaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        nota = serializer.validated_data['nota']

        publicacion.estado = 'rechazada'
        publicacion.motivo_rechazo_verificacion = nota
        publicacion.save(update_fields=['estado', 'motivo_rechazo_verificacion', 'actualizado_en'])
        EventoModeracion.objects.create(publicacion=publicacion, tipo='rechazo', nota=nota)
        return Response(PublicacionSerializer(publicacion).data)


class PublicacionSolicitarModificacionesView(APIView):
    permission_classes = [EsAdministrador]

    def post(self, request, id, *args, **kwargs):
        publicacion = generics.get_object_or_404(Publicacion, id=id)
        serializer = AccionConNotaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        nota = serializer.validated_data['nota']

        publicacion.estado = 'observada'
        publicacion.nota_moderacion = nota
        publicacion.save(update_fields=['estado', 'nota_moderacion', 'actualizado_en'])
        EventoModeracion.objects.create(publicacion=publicacion, tipo='solicitud_modificacion', nota=nota)
        return Response(PublicacionSerializer(publicacion).data)
