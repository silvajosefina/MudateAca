from django.urls import path

from . import views

urlpatterns = [
    path('', views.ReclamoListaCrearView.as_view(), name='reclamo-lista'),
    path('mios/', views.MisReclamosView.as_view(), name='reclamo-mios'),
    path('<int:id>/estado/', views.ReclamoCambiarEstadoView.as_view(), name='reclamo-estado'),
]
