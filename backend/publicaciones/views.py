from django.db import transaction
from django.db.models import Count
from django.http import Http404
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import SAFE_METHODS, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from auditoria.servicios import registrar_accion
from config.paginacion import PaginacionExplorar, PaginacionMisPublicaciones
from usuarios.permissions import EsAdministrador

from .estados import (
    ESTADOS_DETALLE_PUBLICO,
    ESTADOS_EDITABLES,
    ESTADOS_EN_REVISION,
    ESTADOS_LISTADO_PUBLICO,
    cambiar_estado,
    eliminar_logicamente,
)
from .filtros import FiltroMisPublicacionesSerializer, FiltrosPublicacionesSerializer, aplicar_filtros
from .models import EstadoPublicacion, EventoModeracion, Publicacion
from .permissions import EsDuenoDeLaPublicacion, EsPropietarioOInmobiliaria
from .serializers import (
    AccionConNotaSerializer,
    CambioEstadoSerializer,
    PublicacionEscrituraSerializer,
    PublicacionPropiaSerializer,
    PublicacionPublicaSerializer,
    PublicacionSerializer,
)


def publicaciones_con_relaciones():
    return Publicacion.objects.select_related(
        'propietario__rol', 'propietario__estado_cuenta', 'tipo_inmueble', 'modalidad', 'estado',
    ).prefetch_related('fotos', 'eventos_moderacion')


def respuesta_interna(request, publicacion, **kwargs):
    # Relee la publicación para no devolver relaciones que quedaron viejas tras escribir.
    actualizada = publicaciones_con_relaciones().get(id=publicacion.id)
    return Response(PublicacionSerializer(actualizada, context={'request': request}).data, **kwargs)


def obtener_para_moderar(id):
    publicacion = generics.get_object_or_404(Publicacion, id=id)
    if publicacion.estado.codigo not in ESTADOS_EN_REVISION:
        raise ValidationError({'detail': 'Solo se pueden moderar publicaciones en revisión u observadas.'})
    return publicacion


class PublicacionListaCrearView(generics.ListCreateAPIView):
    pagination_class = PaginacionExplorar

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [AllowAny()]
        return [EsPropietarioOInmobiliaria()]

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return PublicacionPublicaSerializer
        return PublicacionEscrituraSerializer

    def get_queryset(self):
        return (
            publicaciones_con_relaciones()
            .filter(estado__codigo__in=ESTADOS_LISTADO_PUBLICO)
            .order_by('-actualizado_en', '-id')
        )

    def filter_queryset(self, queryset):
        filtros = FiltrosPublicacionesSerializer(data=self.request.query_params, partial=True)
        filtros.is_valid(raise_exception=True)
        return aplicar_filtros(queryset, filtros.validated_data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        publicacion = serializer.save()
        return respuesta_interna(request, publicacion, status=status.HTTP_201_CREATED)


class MisPublicacionesView(generics.ListAPIView):
    serializer_class = PublicacionPropiaSerializer
    permission_classes = [EsPropietarioOInmobiliaria]
    pagination_class = PaginacionMisPublicaciones

    def get_queryset(self):
        return (
            publicaciones_con_relaciones()
            .filter(propietario=self.request.user)
            .order_by('-actualizado_en', '-id')
        )

    def filter_queryset(self, queryset):
        filtro = FiltroMisPublicacionesSerializer(data=self.request.query_params, partial=True)
        filtro.is_valid(raise_exception=True)
        estado = filtro.validated_data.get('estado')
        return queryset.filter(estado=estado) if estado else queryset

    def list(self, request, *args, **kwargs):
        respuesta = super().list(request, *args, **kwargs)
        totales = (
            Publicacion.objects.filter(propietario=request.user)
            .order_by()
            .values('estado__codigo')
            .annotate(cantidad=Count('id'))
        )
        respuesta.data['totales'] = {fila['estado__codigo']: fila['cantidad'] for fila in totales}
        return respuesta


class PublicacionDetalleView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PublicacionEscrituraSerializer
    lookup_field = 'id'
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [AllowAny()]
        return [EsPropietarioOInmobiliaria(), EsDuenoDeLaPublicacion()]

    def get_queryset(self):
        return publicaciones_con_relaciones()

    def _ve_datos_internos(self, publicacion):
        usuario = self.request.user
        return usuario.is_authenticated and (usuario.es_administrador or publicacion.propietario_id == usuario.id)

    def retrieve(self, request, *args, **kwargs):
        publicacion = self.get_object()
        if self._ve_datos_internos(publicacion):
            return respuesta_interna(request, publicacion)
        if publicacion.estado.codigo not in ESTADOS_DETALLE_PUBLICO:
            raise Http404
        return Response(PublicacionPublicaSerializer(publicacion, context={'request': request}).data)

    def partial_update(self, request, *args, **kwargs):
        publicacion = self.get_object()
        if publicacion.estado.codigo not in ESTADOS_EDITABLES:
            raise ValidationError({'detail': 'Esta publicación no se puede editar en su estado actual.'})
        serializer = self.get_serializer(publicacion, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return respuesta_interna(request, serializer.save())

    def destroy(self, request, *args, **kwargs):
        # RF-09: eliminación lógica; el registro se conserva para historial y auditoría.
        eliminar_logicamente(self.get_object(), request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublicacionCambiarEstadoView(APIView):
    permission_classes = [EsPropietarioOInmobiliaria, EsDuenoDeLaPublicacion]

    def post(self, request, id, *args, **kwargs):
        publicacion = generics.get_object_or_404(Publicacion, id=id)
        self.check_object_permissions(request, publicacion)
        serializer = CambioEstadoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cambiar_estado(publicacion, serializer.validated_data['estado'])
        return respuesta_interna(request, publicacion)


class PublicacionPendientesListView(generics.ListAPIView):
    serializer_class = PublicacionSerializer
    permission_classes = [EsAdministrador]

    def get_queryset(self):
        return publicaciones_con_relaciones().filter(estado__codigo__in=ESTADOS_EN_REVISION).order_by('creado_en')


class PublicacionAprobarView(APIView):
    permission_classes = [EsAdministrador]

    @transaction.atomic
    def post(self, request, id, *args, **kwargs):
        publicacion = obtener_para_moderar(id)
        publicacion.estado = EstadoPublicacion.por_codigo('activa')
        publicacion.save(update_fields=['estado', 'actualizado_en'])
        registrar_accion(request.user, 'aprobacion_publicacion', publicacion)
        return respuesta_interna(request, publicacion)


class PublicacionRechazarView(APIView):
    permission_classes = [EsAdministrador]

    @transaction.atomic
    def post(self, request, id, *args, **kwargs):
        publicacion = obtener_para_moderar(id)
        serializer = AccionConNotaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        nota = serializer.validated_data['nota']

        publicacion.estado = EstadoPublicacion.por_codigo('rechazada')
        publicacion.save(update_fields=['estado', 'actualizado_en'])
        EventoModeracion.objects.create(
            publicacion=publicacion, administrador=request.user, tipo='rechazo', nota=nota,
        )
        registrar_accion(request.user, 'rechazo_publicacion', publicacion, nota)
        return respuesta_interna(request, publicacion)


class PublicacionSolicitarModificacionesView(APIView):
    permission_classes = [EsAdministrador]

    @transaction.atomic
    def post(self, request, id, *args, **kwargs):
        publicacion = obtener_para_moderar(id)
        serializer = AccionConNotaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        nota = serializer.validated_data['nota']

        publicacion.estado = EstadoPublicacion.por_codigo('observada')
        publicacion.save(update_fields=['estado', 'actualizado_en'])
        EventoModeracion.objects.create(
            publicacion=publicacion, administrador=request.user, tipo='solicitud_modificacion', nota=nota,
        )
        registrar_accion(request.user, 'solicitud_modificaciones', publicacion, nota)
        return respuesta_interna(request, publicacion)
