from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from config.catalogos import Catalogo

from .managers import UsuarioManager
from .validators import validador_celular


class Rol(Catalogo):
    class Meta(Catalogo.Meta):
        db_table = 'rol'
        verbose_name = 'rol'
        verbose_name_plural = 'roles'


class EstadoCuenta(Catalogo):
    class Meta(Catalogo.Meta):
        db_table = 'estado_cuenta'
        verbose_name = 'estado de cuenta'
        verbose_name_plural = 'estados de cuenta'


class Usuario(AbstractBaseUser, PermissionsMixin):
    rol = models.ForeignKey(Rol, on_delete=models.PROTECT, related_name='usuarios')
    estado_cuenta = models.ForeignKey(EstadoCuenta, on_delete=models.PROTECT, related_name='usuarios')

    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    celular = models.CharField(max_length=20, validators=[validador_celular])
    correo = models.EmailField(unique=True)
    razon_social = models.CharField(max_length=150, blank=True, null=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    objects = UsuarioManager()

    USERNAME_FIELD = 'correo'
    REQUIRED_FIELDS = ['nombre', 'apellido', 'celular']

    class Meta:
        db_table = 'usuario'
        verbose_name = 'usuario'
        verbose_name_plural = 'usuarios'

    def __str__(self):
        return f'{self.nombre} {self.apellido} ({self.correo})'

    @property
    def es_administrador(self):
        return self.rol.codigo == 'administrador'

    @property
    def esta_suspendido(self):
        return self.estado_cuenta.codigo == 'suspendido'

    @property
    def motivo_suspension(self):
        suspension = self.suspensiones.filter(levantada_en__isnull=True).first()
        return suspension.motivo if suspension else None

    def save(self, *args, **kwargs):
        if self.es_administrador:
            self.is_staff = True
        super().save(*args, **kwargs)


class Suspension(models.Model):
    # Historial de suspensiones (RF-20): cada una conserva su motivo y cuándo se levantó.
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='suspensiones')
    administrador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='suspensiones_aplicadas',
    )
    motivo = models.TextField()
    creado_en = models.DateTimeField(auto_now_add=True)
    levantada_en = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'suspension'
        verbose_name = 'suspensión'
        verbose_name_plural = 'suspensiones'
        ordering = ['-creado_en']

    def __str__(self):
        return f'Suspensión de {self.usuario.correo}'
