from django.contrib import admin

from .models import BusquedaActiva, Coincidencia, EstadoBusqueda

admin.site.register([EstadoBusqueda, BusquedaActiva, Coincidencia])
