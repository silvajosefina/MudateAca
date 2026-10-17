from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from .managers import UsuarioManager
from .validators import validador_celular

ROLES = [
    ('interesado', 'Interesado'),
    ('propietario', 'Propietario'),
    ('inmobiliaria', 'Inmobiliaria'),
    ('administrador', 'Administrador'),
]

# RF-20: los usuarios pueden encontrarse activos o suspendidos.
ESTADOS_CUENTA = [
    ('activo', 'Activo'),
    ('suspendido', 'Suspendido'),
]


class Usuario(AbstractBaseUser, PermissionsMixin):
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    celular = models.CharField(max_length=20, validators=[validador_celular])
    correo = models.EmailField(unique=True)
    rol = models.CharField(max_length=20, choices=ROLES)

    estado_cuenta = models.CharField(max_length=20, choices=ESTADOS_CUENTA, default='activo')
    motivo_suspension = models.TextField(blank=True, null=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UsuarioManager()

    USERNAME_FIELD = 'correo'
    REQUIRED_FIELDS = ['nombre', 'apellido', 'celular', 'rol']

    class Meta:
        verbose_name = 'usuario'
        verbose_name_plural = 'usuarios'

    def __str__(self):
        return f'{self.nombre} {self.apellido} ({self.correo})'

    def save(self, *args, **kwargs):
        if self.rol == 'administrador':
            self.is_staff = True
        super().save(*args, **kwargs)
