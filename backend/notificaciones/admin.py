from django.contrib import admin

from .models import Notificacion, TipoNotificacion

admin.site.register([TipoNotificacion, Notificacion])
