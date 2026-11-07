from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from config.paginacion import PaginacionNotificaciones

from .serializers import NotificacionSerializer


def notificaciones_del_usuario(usuario):
    return usuario.notificaciones.select_related('tipo', 'referencia_tipo').order_by('-creado_en', '-id')


class NotificacionListaView(generics.ListAPIView):
    serializer_class = NotificacionSerializer
    pagination_class = PaginacionNotificaciones

    def get_queryset(self):
        return notificaciones_del_usuario(self.request.user)

    def delete(self, request, *args, **kwargs):
        notificaciones_del_usuario(request.user).eliminar()
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificacionDetalleView(generics.DestroyAPIView):
    lookup_field = 'id'

    def get_queryset(self):
        return notificaciones_del_usuario(self.request.user)

    def perform_destroy(self, notificacion):
        notificacion.eliminar()


class NotificacionesNoLeidasView(APIView):
    # Pensado para el polling de la campana: una consulta liviana.
    def get(self, request, *args, **kwargs):
        return Response({'cantidad': request.user.notificaciones.filter(leida=False).count()})


class MarcarNotificacionesLeidasView(APIView):
    def post(self, request, *args, **kwargs):
        marcadas = request.user.notificaciones.filter(leida=False).update(leida=True)
        return Response({'marcadas': marcadas})
