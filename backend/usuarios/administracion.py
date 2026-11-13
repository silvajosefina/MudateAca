from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from auditoria.servicios import registrar_accion
from config.paginacion import PaginacionAdministracion
from notificaciones.servicios import notificar

from .models import EstadoCuenta, Suspension, Usuario
from .permissions import EsAdministrador
from .serializers import FiltroUsuariosSerializer, MotivoSuspensionSerializer, UsuarioAdministracionSerializer
from .utils import enviar_correo


def usuarios_gestionables():
    # Los administradores no se gestionan desde la API.
    return (
        Usuario.objects.exclude(rol__codigo='administrador')
        .annotate(
            cantidad_publicaciones=Count(
                'publicaciones', filter=~Q(publicaciones__estado__codigo='eliminada'), distinct=True,
            ),
            cantidad_reclamos_recibidos=Count('reclamos_recibidos', distinct=True),
        )
        .prefetch_related('suspensiones')
        .order_by('-fecha_registro', '-id')
    )


def avisar_por_correo(usuario, asunto, cuerpo):
    # Se envía al confirmar la transacción: si el correo falla, la suspensión no se pierde.
    transaction.on_commit(lambda: enviar_correo(asunto, cuerpo, [usuario.correo]))


class UsuariosAdministracionView(generics.ListAPIView):
    serializer_class = UsuarioAdministracionSerializer
    permission_classes = [EsAdministrador]
    pagination_class = PaginacionAdministracion

    def filter_queryset(self, queryset):
        filtro = FiltroUsuariosSerializer(data=self.request.query_params, partial=True)
        filtro.is_valid(raise_exception=True)
        datos = filtro.validated_data
        if datos.get('estado'):
            queryset = queryset.filter(estado_cuenta__codigo=datos['estado'])
        if datos.get('rol'):
            queryset = queryset.filter(rol__codigo=datos['rol'])
        if datos.get('busqueda'):
            texto = datos['busqueda']
            queryset = queryset.filter(
                Q(nombre__icontains=texto) | Q(apellido__icontains=texto)
                | Q(correo__icontains=texto) | Q(razon_social__icontains=texto),
            )
        return queryset

    def get_queryset(self):
        return usuarios_gestionables()

    def list(self, request, *args, **kwargs):
        respuesta = super().list(request, *args, **kwargs)
        filas = (
            Usuario.objects.exclude(rol__codigo='administrador')
            .order_by().values('estado_cuenta__codigo').annotate(cantidad=Count('id'))
        )
        respuesta.data['totales'] = {fila['estado_cuenta__codigo']: fila['cantidad'] for fila in filas}
        return respuesta


class UsuarioAdministracionDetalleView(generics.RetrieveAPIView):
    serializer_class = UsuarioAdministracionSerializer
    permission_classes = [EsAdministrador]
    lookup_field = 'id'

    def get_queryset(self):
        return usuarios_gestionables()


class SuspenderUsuarioView(APIView):
    permission_classes = [EsAdministrador]

    @transaction.atomic
    def post(self, request, id, *args, **kwargs):
        usuario = generics.get_object_or_404(usuarios_gestionables(), id=id)
        if usuario.esta_suspendido:
            raise ValidationError({'detail': 'La cuenta ya está suspendida.'})
        serializer = MotivoSuspensionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        motivo = serializer.validated_data['motivo']

        usuario.estado_cuenta = EstadoCuenta.por_codigo('suspendido')
        usuario.save(update_fields=['estado_cuenta'])
        Suspension.objects.create(usuario=usuario, administrador=request.user, motivo=motivo)
        registrar_accion(request.user, 'suspension_usuario', usuario, motivo)

        # RF-20: se le informa que fue suspendida y el motivo. Como no puede iniciar sesión, también por correo.
        notificar([usuario], f'Tu cuenta fue suspendida. Motivo: {motivo}', 'error')
        avisar_por_correo(
            usuario,
            'Tu cuenta de Mudate Acá fue suspendida',
            f'Hola, {usuario.nombre}. Tu cuenta de Mudate Acá fue suspendida. Motivo: {motivo}',
        )
        return Response(UsuarioAdministracionSerializer(usuarios_gestionables().get(id=usuario.id)).data)


class ReactivarUsuarioView(APIView):
    permission_classes = [EsAdministrador]

    @transaction.atomic
    def post(self, request, id, *args, **kwargs):
        usuario = generics.get_object_or_404(usuarios_gestionables(), id=id)
        if not usuario.esta_suspendido:
            raise ValidationError({'detail': 'La cuenta no está suspendida.'})

        usuario.estado_cuenta = EstadoCuenta.por_codigo('activo')
        usuario.save(update_fields=['estado_cuenta'])
        usuario.suspensiones.filter(levantada_en__isnull=True).update(levantada_en=timezone.now())
        registrar_accion(request.user, 'reactivacion_usuario', usuario)

        notificar([usuario], 'Tu cuenta fue reactivada. Ya podés iniciar sesión con normalidad.')
        avisar_por_correo(
            usuario,
            'Tu cuenta de Mudate Acá fue reactivada',
            f'Hola, {usuario.nombre}. Tu cuenta de Mudate Acá fue reactivada. Ya podés iniciar sesión con normalidad.',
        )
        return Response(UsuarioAdministracionSerializer(usuarios_gestionables().get(id=usuario.id)).data)
