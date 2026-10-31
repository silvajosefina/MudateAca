from django.db import transaction
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from usuarios.permissions import EsInteresado

from .coincidencias import recalcular_por_busqueda
from .models import BusquedaActiva, EstadoBusqueda
from .serializers import BusquedaActivaSerializer, CambioEstadoBusquedaSerializer, CoincidenciaSerializer

ESTADOS_ELEGIBLES = ('activa', 'pausada')


def busquedas_del_usuario(usuario):
    return BusquedaActiva.objects.filter(usuario=usuario).select_related('modalidad', 'tipo_inmueble', 'estado')


class BusquedaListaCrearView(generics.ListCreateAPIView):
    serializer_class = BusquedaActivaSerializer
    permission_classes = [EsInteresado]

    def get_queryset(self):
        return busquedas_del_usuario(self.request.user)

    @transaction.atomic
    def perform_create(self, serializer):
        busqueda = serializer.save(usuario=self.request.user, estado=EstadoBusqueda.por_codigo('activa'))
        recalcular_por_busqueda(busqueda)


class BusquedaDetalleView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BusquedaActivaSerializer
    permission_classes = [EsInteresado]
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        return busquedas_del_usuario(self.request.user)

    @transaction.atomic
    def perform_update(self, serializer):
        recalcular_por_busqueda(serializer.save())


class BusquedaCambiarEstadoView(APIView):
    permission_classes = [EsInteresado]

    @transaction.atomic
    def post(self, request, id, *args, **kwargs):
        busqueda = generics.get_object_or_404(busquedas_del_usuario(request.user), id=id)
        serializer = CambioEstadoBusquedaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        destino = serializer.validated_data['estado']

        if destino not in ESTADOS_ELEGIBLES or destino == busqueda.estado.codigo:
            raise ValidationError({'estado': ['Esta búsqueda no puede pasar a ese estado.']})

        busqueda.estado = EstadoBusqueda.por_codigo(destino)
        busqueda.save(update_fields=['estado', 'actualizado_en'])
        if destino == 'activa':
            recalcular_por_busqueda(busqueda)
        return Response(BusquedaActivaSerializer(busqueda, context={'request': request}).data)


class BusquedaCoincidenciasView(generics.ListAPIView):
    serializer_class = CoincidenciaSerializer
    permission_classes = [EsInteresado]

    def get_queryset(self):
        busqueda = generics.get_object_or_404(busquedas_del_usuario(self.request.user), id=self.kwargs['id'])
        return (
            busqueda.coincidencias_visibles()
            .select_related(
                'publicacion__propietario__rol', 'publicacion__tipo_inmueble',
                'publicacion__modalidad', 'publicacion__estado',
            )
            .prefetch_related('publicacion__fotos')
            .order_by('-nivel_compatibilidad', '-creado_en')
        )
