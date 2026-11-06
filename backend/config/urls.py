from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from busquedas.views import PanelDemandaView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('usuarios.urls')),
    path('api/publicaciones/', include('publicaciones.urls')),
    path('api/busquedas/', include('busquedas.urls')),
    path('api/conversaciones/', include('mensajeria.urls')),
    path('api/favoritos/', include('favoritos.urls')),
    path('api/notificaciones/', include('notificaciones.urls')),
    path('api/reclamos/', include('reclamos.urls')),
    path('api/demanda/', PanelDemandaView.as_view(), name='panel-demanda'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
