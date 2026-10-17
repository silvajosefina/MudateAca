from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    model = Usuario
    ordering = ['-date_joined']
    list_display = ['correo', 'nombre', 'apellido', 'rol', 'estado_cuenta', 'is_staff']
    list_filter = ['rol', 'estado_cuenta']
    search_fields = ['correo', 'nombre', 'apellido']

    fieldsets = (
        (None, {'fields': ('correo', 'password')}),
        ('Datos personales', {'fields': ('nombre', 'apellido', 'celular')}),
        ('Rol y estado', {'fields': ('rol', 'estado_cuenta', 'motivo_suspension')}),
        ('Permisos', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {'fields': ('correo', 'nombre', 'apellido', 'celular', 'rol', 'password1', 'password2')}),
    )
