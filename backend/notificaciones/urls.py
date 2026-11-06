from django.urls import path

from . import views

urlpatterns = [
    path('', views.NotificacionListaView.as_view(), name='notificacion-lista'),
    path('no-leidas/', views.NotificacionesNoLeidasView.as_view(), name='notificacion-no-leidas'),
    path('marcar-leidas/', views.MarcarNotificacionesLeidasView.as_view(), name='notificacion-marcar-leidas'),
    path('<int:id>/', views.NotificacionDetalleView.as_view(), name='notificacion-detalle'),
]
