from django.urls import path

from . import views

urlpatterns = [
    path('registro/', views.RegistroView.as_view(), name='registro'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('refresh/', views.RefreshView.as_view(), name='refresh'),
    path('perfil/', views.PerfilView.as_view(), name='perfil'),
    path('recuperar/', views.SolicitarRecuperacionView.as_view(), name='recuperar'),
    path('recuperar/confirmar/', views.ConfirmarRecuperacionView.as_view(), name='recuperar-confirmar'),
]
