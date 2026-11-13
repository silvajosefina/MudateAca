from django.urls import path

from . import administracion

urlpatterns = [
    path('', administracion.UsuariosAdministracionView.as_view(), name='usuario-administracion'),
    path('<int:id>/', administracion.UsuarioAdministracionDetalleView.as_view(), name='usuario-administracion-detalle'),
    path('<int:id>/suspender/', administracion.SuspenderUsuarioView.as_view(), name='usuario-suspender'),
    path('<int:id>/reactivar/', administracion.ReactivarUsuarioView.as_view(), name='usuario-reactivar'),
]
