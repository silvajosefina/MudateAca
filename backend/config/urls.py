from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path

from busquedas.views import PanelDemandaView
from config.excepciones import ruta_inexistente

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('usuarios.urls')),
    path('api/usuarios/', include('usuarios.urls_administracion')),
    path('api/publicaciones/', include('publicaciones.urls')),
    path('api/busquedas/', include('busquedas.urls')),
    path('api/conversaciones/', include('mensajeria.urls')),
    path('api/favoritos/', include('favoritos.urls')),
    path('api/notificaciones/', include('notificaciones.urls')),
    path('api/reclamos/', include('reclamos.urls')),
    path('api/demanda/', PanelDemandaView.as_view(), name='panel-demanda'),
    # Siempre al final: atrapa cualquier ruta de la API que no exista.
    re_path(r'^api/', ruta_inexistente),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
