from django.contrib import admin

from .models import EventoModeracion, FotoPublicacion, Publicacion


class FotoPublicacionInline(admin.TabularInline):
    model = FotoPublicacion
    extra = 0


class EventoModeracionInline(admin.TabularInline):
    model = EventoModeracion
    extra = 0
    readonly_fields = ['tipo', 'nota', 'creado_en']
    can_delete = False


@admin.register(Publicacion)
class PublicacionAdmin(admin.ModelAdmin):
    list_display = ['descripcion_corta', 'propietario', 'tipo_inmueble', 'estado', 'creado_en']
    list_filter = ['estado', 'tipo_inmueble', 'modalidad']
    search_fields = ['descripcion', 'ubicacion', 'propietario__correo']
    inlines = [FotoPublicacionInline, EventoModeracionInline]

    def descripcion_corta(self, obj):
        return obj.descripcion[:50]

    descripcion_corta.short_description = 'Descripción'
