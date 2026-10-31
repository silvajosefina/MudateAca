from django.urls import path

from . import views

urlpatterns = [
    path('', views.BusquedaListaCrearView.as_view(), name='busqueda-lista'),
    path('<int:id>/', views.BusquedaDetalleView.as_view(), name='busqueda-detalle'),
    path('<int:id>/estado/', views.BusquedaCambiarEstadoView.as_view(), name='busqueda-estado'),
    path('<int:id>/coincidencias/', views.BusquedaCoincidenciasView.as_view(), name='busqueda-coincidencias'),
]
