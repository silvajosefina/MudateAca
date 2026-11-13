from django.db import transaction
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from auditoria.servicios import registrar_accion
from notificaciones.servicios import notificar, resumen
from usuarios.permissions import EsAdministrador

from .models import EstadoReclamo, Reclamo
from .serializers import (
    CambioEstadoReclamoSerializer,
    CrearReclamoSerializer,
    FiltroReclamosSerializer,
    ReclamoSerializer,
)

TRANSICIONES = {
    'pendiente': ('en_revision', 'resuelto', 'descartado'),
    'en_revision': ('resuelto', 'descartado'),
}


class NoEsAdministrador(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and not request.user.es_administrador)


def reclamos_con_relaciones():
    return (
        Reclamo.objects.select_related(
            'estado', 'reclamante__rol', 'usuario_reportado__rol', 'publicacion__estado',
        )
        .prefetch_related('publicacion__fotos')
        .order_by('-creado_en', '-id')
    )


def nombre_del_objetivo(reclamo):
    if reclamo.publicacion_id:
        return resumen(reclamo.publicacion.descripcion)
    return f'{reclamo.usuario_reportado.nombre} {reclamo.usuario_reportado.apellido}'


class ReclamoListaCrearView(generics.ListAPIView):
    serializer_class = ReclamoSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [NoEsAdministrador()]
        return [EsAdministrador()]

    def get_queryset(self):
        filtro = FiltroReclamosSerializer(data=self.request.query_params, partial=True)
        filtro.is_valid(raise_exception=True)
        estado = filtro.validated_data.get('estado')
        reclamos = reclamos_con_relaciones()
        return reclamos.filter(estado=estado) if estado else reclamos

    def post(self, request, *args, **kwargs):
        serializer = CrearReclamoSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        reclamo = Reclamo.objects.create(
            reclamante=request.user, estado=EstadoReclamo.por_codigo('pendiente'), **serializer.validated_data,
        )
        reclamo = reclamos_con_relaciones().get(id=reclamo.id)
        return Response(self.get_serializer(reclamo).data, status=status.HTTP_201_CREATED)


class MisReclamosView(generics.ListAPIView):
    serializer_class = ReclamoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return reclamos_con_relaciones().filter(reclamante=self.request.user)


class ReclamoCambiarEstadoView(APIView):
    permission_classes = [EsAdministrador]

    @transaction.atomic
    def post(self, request, id, *args, **kwargs):
        reclamo = generics.get_object_or_404(reclamos_con_relaciones(), id=id)
        serializer = CambioEstadoReclamoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        destino, anterior = serializer.validated_data['estado'], reclamo.estado.codigo

        if destino not in TRANSICIONES.get(anterior, ()):
            raise ValidationError({'estado': ['Este reclamo no puede pasar a ese estado.']})

        reclamo.estado = EstadoReclamo.por_codigo(destino)
        if 'nota_administrador' in serializer.validated_data:
            reclamo.nota_administrador = serializer.validated_data['nota_administrador'] or None
        reclamo.save(update_fields=['estado', 'nota_administrador', 'actualizado_en'])
        registrar_accion(request.user, 'cambio_estado_reclamo', reclamo, f'{anterior} -> {destino}')

        if destino in ('resuelto', 'descartado'):
            texto = 'fue resuelto' if destino == 'resuelto' else 'fue descartado'
            notificar(
                [reclamo.reclamante],
                f'Tu reclamo sobre "{nombre_del_objetivo(reclamo)}" {texto}.',
                'exito' if destino == 'resuelto' else 'error',
                reclamo,
            )
        return Response(ReclamoSerializer(reclamo, context={'request': request}).data)
