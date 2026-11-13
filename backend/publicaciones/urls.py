from django.urls import path

from . import views

urlpatterns = [
    path('', views.PublicacionListaCrearView.as_view(), name='publicacion-lista'),
    path('mias/', views.MisPublicacionesView.as_view(), name='publicacion-mias'),
    path('pendientes/', views.PublicacionPendientesListView.as_view(), name='publicacion-pendientes'),
    path('administracion/', views.PublicacionesAdministracionView.as_view(), name='publicacion-administracion'),
    path('<int:id>/', views.PublicacionDetalleView.as_view(), name='publicacion-detalle'),
    path('<int:id>/estado/', views.PublicacionCambiarEstadoView.as_view(), name='publicacion-estado'),
    path('<int:id>/aprobar/', views.PublicacionAprobarView.as_view(), name='publicacion-aprobar'),
    path('<int:id>/rechazar/', views.PublicacionRechazarView.as_view(), name='publicacion-rechazar'),
    path(
        '<int:id>/solicitar-modificaciones/',
        views.PublicacionSolicitarModificacionesView.as_view(),
        name='publicacion-solicitar-modificaciones',
    ),
    path(
        '<int:id>/mantener-observada/',
        views.PublicacionMantenerObservadaView.as_view(),
        name='publicacion-mantener-observada',
    ),
    path('<int:id>/ocultar/', views.PublicacionOcultarView.as_view(), name='publicacion-ocultar'),
    path('<int:id>/mostrar/', views.PublicacionMostrarView.as_view(), name='publicacion-mostrar'),
]
