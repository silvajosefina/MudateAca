from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import EstadoCuenta, Rol, Suspension, Usuario

admin.site.register([Rol, EstadoCuenta])


class SuspensionInline(admin.TabularInline):
    model = Suspension
    fk_name = 'usuario'
    extra = 0
    readonly_fields = ['creado_en']


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    model = Usuario
    ordering = ['-fecha_registro']
    list_display = ['correo', 'nombre', 'apellido', 'rol', 'estado_cuenta', 'is_staff']
    list_filter = ['rol', 'estado_cuenta']
    search_fields = ['correo', 'nombre', 'apellido']
    inlines = [SuspensionInline]

    fieldsets = (
        (None, {'fields': ('correo', 'password')}),
        ('Datos personales', {'fields': ('nombre', 'apellido', 'celular', 'razon_social')}),
        ('Rol y estado', {'fields': ('rol', 'estado_cuenta')}),
        ('Permisos', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (
            None,
            {'fields': ('correo', 'nombre', 'apellido', 'celular', 'rol', 'estado_cuenta', 'password1', 'password2')},
        ),
    )
