import os

from django.db import transaction
from django.db.models import Count
from django.http import FileResponse, Http404, HttpResponseRedirect
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import SAFE_METHODS, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from auditoria.servicios import registrar_accion
from config.almacenamiento import AlmacenamientoCloudinary
from config.paginacion import PaginacionAdministracion, PaginacionExplorar, PaginacionMisPublicaciones
from notificaciones.servicios import notificar
from usuarios.permissions import EsAdministrador

from .estados import (
    ESTADOS_DETALLE_PUBLICO,
    ESTADOS_EDITABLES,
    ESTADOS_EN_REVISION,
    ESTADOS_LISTADO_PUBLICO,
    ESTADOS_OCULTABLES,
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


def totales_por_estado(publicaciones):
    filas = publicaciones.order_by().values('estado__codigo').annotate(cantidad=Count('id'))
    return {fila['estado__codigo']: fila['cantidad'] for fila in filas}


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
        respuesta.data['totales'] = totales_por_estado(Publicacion.objects.filter(propietario=request.user))
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


class PublicacionDocumentoView(APIView):
    # RNF-06: la documentación de verificación solo la descargan el dueño y los administradores.
    def get(self, request, id, *args, **kwargs):
        publicacion = generics.get_object_or_404(Publicacion, id=id)
        if not (request.user.es_administrador or publicacion.propietario_id == request.user.id):
            raise Http404
        archivo = publicacion.archivo_verificacion
        if isinstance(archivo.storage, AlmacenamientoCloudinary):
            return HttpResponseRedirect(archivo.url)
        try:
            return FileResponse(archivo.open('rb'), filename=os.path.basename(archivo.name))
        except FileNotFoundError:
            raise NotFound('El documento no está disponible.')


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


class PublicacionesAdministracionView(generics.ListAPIView):
    # RF-19: el administrador consulta todas las publicaciones, en cualquier estado.
    serializer_class = PublicacionSerializer
    permission_classes = [EsAdministrador]
    pagination_class = PaginacionAdministracion

    def get_queryset(self):
        return publicaciones_con_relaciones().order_by('-actualizado_en', '-id')

    def filter_queryset(self, queryset):
        filtro = FiltroMisPublicacionesSerializer(data=self.request.query_params, partial=True)
        filtro.is_valid(raise_exception=True)
        estado = filtro.validated_data.get('estado')
        return queryset.filter(estado=estado) if estado else queryset

    def list(self, request, *args, **kwargs):
        respuesta = super().list(request, *args, **kwargs)
        respuesta.data['totales'] = totales_por_estado(Publicacion.objects.all())
        return respuesta


class PublicacionAprobarView(APIView):
    permission_classes = [EsAdministrador]

    @transaction.atomic
    def post(self, request, id, *args, **kwargs):
        publicacion = obtener_para_moderar(id)
        publicacion.estado = EstadoPublicacion.por_codigo('activa')
        publicacion.save(update_fields=['estado', 'actualizado_en'])
        registrar_accion(request.user, 'aprobacion_publicacion', publicacion)
        notificar(
            [publicacion.propietario], 'Tu publicación fue verificada y ya está activa.', referencia=publicacion,
        )
        return respuesta_interna(request, publicacion)


class AccionAdministrativaConNotaView(APIView):
    # Rechazar, pedir cambios, mantener observada u ocultar: exigen nota, quedan en el historial
    # de moderación y en la auditoría (RF-19, RNF-12) y avisan al dueño.
    permission_classes = [EsAdministrador]
    estados_permitidos = ESTADOS_EN_REVISION
    mensaje_estado_invalido = 'Solo se pueden moderar publicaciones en revisión u observadas.'
    estado_destino = None
    tipo_evento = None
    tipo_accion = None

    def aviso(self, nota):
        raise NotImplementedError

    @transaction.atomic
    def post(self, request, id, *args, **kwargs):
        publicacion = generics.get_object_or_404(Publicacion, id=id)
        if publicacion.estado.codigo not in self.estados_permitidos:
            raise ValidationError({'detail': self.mensaje_estado_invalido})
        serializer = AccionConNotaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        nota = serializer.validated_data['nota']

        if self.estado_destino:
            publicacion.estado = EstadoPublicacion.por_codigo(self.estado_destino)
            publicacion.save(update_fields=['estado', 'actualizado_en'])
        EventoModeracion.objects.create(
            publicacion=publicacion, administrador=request.user, tipo=self.tipo_evento, nota=nota,
        )
        registrar_accion(request.user, self.tipo_accion, publicacion, nota)
        notificar([publicacion.propietario], self.aviso(nota), 'error', publicacion)
        return respuesta_interna(request, publicacion)


class PublicacionRechazarView(AccionAdministrativaConNotaView):
    estado_destino = 'rechazada'
    tipo_evento = 'rechazo'
    tipo_accion = 'rechazo_publicacion'

    def aviso(self, nota):
        return f'Tu publicación fue rechazada. Motivo: {nota}'


class PublicacionSolicitarModificacionesView(AccionAdministrativaConNotaView):
    estado_destino = 'observada'
    tipo_evento = 'solicitud_modificacion'
    tipo_accion = 'solicitud_modificaciones'

    def aviso(self, nota):
        return f'Un administrador solicitó modificaciones en tu publicación. Nota: {nota}'


class PublicacionMantenerObservadaView(AccionAdministrativaConNotaView):
    estados_permitidos = ('observada',)
    mensaje_estado_invalido = 'Solo se puede mantener observada una publicación observada.'
    tipo_evento = 'mantener_observada'
    tipo_accion = 'mantener_observada'

    def aviso(self, nota):
        return f'Un administrador revisó tu publicación y sigue observada. Nota: {nota}'


class PublicacionOcultarView(AccionAdministrativaConNotaView):
    estados_permitidos = ESTADOS_OCULTABLES
    mensaje_estado_invalido = 'Esta publicación no se puede ocultar en su estado actual.'
    estado_destino = 'oculta'
    tipo_evento = 'ocultamiento'
    tipo_accion = 'ocultamiento_publicacion'

    def aviso(self, nota):
        return f'Un administrador ocultó tu publicación. Motivo: {nota}'


class PublicacionMostrarView(APIView):
    permission_classes = [EsAdministrador]

    @transaction.atomic
    def post(self, request, id, *args, **kwargs):
        publicacion = generics.get_object_or_404(Publicacion, id=id)
        if publicacion.estado.codigo != 'oculta':
            raise ValidationError({'detail': 'Solo se puede volver a mostrar una publicación oculta.'})
        publicacion.estado = EstadoPublicacion.por_codigo('activa')
        publicacion.save(update_fields=['estado', 'actualizado_en'])
        registrar_accion(request.user, 'restauracion_publicacion', publicacion)
        notificar([publicacion.propietario], 'Tu publicación volvió a estar visible.', referencia=publicacion)
        return respuesta_interna(request, publicacion)
