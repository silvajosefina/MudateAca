from django.urls import path

from . import views

urlpatterns = [
    path('', views.PublicacionListaCrearView.as_view(), name='publicacion-lista'),
    path('pendientes/', views.PublicacionPendientesListView.as_view(), name='publicacion-pendientes'),
    path('<int:id>/', views.PublicacionDetalleView.as_view(), name='publicacion-detalle'),
    path('<int:id>/estado/', views.PublicacionCambiarEstadoView.as_view(), name='publicacion-estado'),
    path('<int:id>/aprobar/', views.PublicacionAprobarView.as_view(), name='publicacion-aprobar'),
    path('<int:id>/rechazar/', views.PublicacionRechazarView.as_view(), name='publicacion-rechazar'),
    path(
        '<int:id>/solicitar-modificaciones/',
        views.PublicacionSolicitarModificacionesView.as_view(),
        name='publicacion-solicitar-modificaciones',
    ),
]
