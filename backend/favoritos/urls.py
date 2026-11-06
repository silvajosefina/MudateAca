from django.urls import path

from . import views

urlpatterns = [
    path('', views.FavoritoListaView.as_view(), name='favorito-lista'),
    path('<int:publicacion_id>/', views.FavoritoQuitarView.as_view(), name='favorito-quitar'),
]
