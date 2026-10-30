from django.contrib import admin

from .models import EstadoReclamo, Reclamo

admin.site.register([EstadoReclamo, Reclamo])
