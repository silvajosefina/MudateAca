from django.urls import path

from . import views

urlpatterns = [
    path('', views.ConversacionListaCrearView.as_view(), name='conversacion-lista'),
    path('<int:id>/', views.ConversacionDetalleView.as_view(), name='conversacion-detalle'),
    path('<int:id>/mensajes/', views.MensajeListaCrearView.as_view(), name='conversacion-mensajes'),
]
