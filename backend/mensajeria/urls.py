from django.urls import path

from . import views

urlpatterns = [
    path('', views.ConversacionListaCrearView.as_view(), name='conversacion-lista'),
    path('no-leidos/', views.MensajesNoLeidosView.as_view(), name='conversacion-no-leidos'),
    path('<int:id>/', views.ConversacionDetalleView.as_view(), name='conversacion-detalle'),
    path('<int:id>/mensajes/', views.MensajeListaCrearView.as_view(), name='conversacion-mensajes'),
    path('<int:id>/leer/', views.MarcarConversacionLeidaView.as_view(), name='conversacion-leer'),
]
