from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from config.paginacion import PaginacionExplorar
from publicaciones.estados import ESTADOS_DETALLE_PUBLICO
from publicaciones.models import Publicacion
from usuarios.permissions import EsInteresado

from .models import Favorito
from .serializers import AgregarFavoritoSerializer, FavoritoSerializer


def favoritos_del_usuario(usuario):
    return (
        Favorito.objects.filter(usuario=usuario)
        .select_related(
            'publicacion__estado', 'publicacion__propietario__rol',
            'publicacion__tipo_inmueble', 'publicacion__modalidad',
        )
        .prefetch_related('publicacion__fotos')
        .order_by('-creado_en', '-id')
    )


class FavoritoListaView(generics.ListAPIView):
    serializer_class = FavoritoSerializer
    permission_classes = [EsInteresado]
    pagination_class = PaginacionExplorar

    def get_queryset(self):
        return favoritos_del_usuario(self.request.user)

    def post(self, request, *args, **kwargs):
        serializer = AgregarFavoritoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        publicacion = generics.get_object_or_404(
            Publicacion.objects.select_related('estado'), id=serializer.validated_data['publicacion'],
        )

        existente = Favorito.objects.filter(usuario=request.user, publicacion=publicacion).first()
        if existente is None and publicacion.estado.codigo not in ESTADOS_DETALLE_PUBLICO:
            raise ValidationError({'publicacion': ['Esta publicación no está disponible.']})

        # RF-14: guardar dos veces la misma publicación devuelve el favorito existente.
        favorito, creado = Favorito.objects.get_or_create(usuario=request.user, publicacion=publicacion)
        favorito = favoritos_del_usuario(request.user).get(id=favorito.id)
        return Response(
            self.get_serializer(favorito).data,
            status=status.HTTP_201_CREATED if creado else status.HTTP_200_OK,
        )


class FavoritoQuitarView(generics.DestroyAPIView):
    permission_classes = [EsInteresado]
    lookup_field = 'publicacion_id'
    lookup_url_kwarg = 'publicacion_id'

    def get_queryset(self):
        return Favorito.objects.filter(usuario=self.request.user)

    def perform_destroy(self, favorito):
        favorito.eliminar()
