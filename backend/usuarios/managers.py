from django.contrib.auth.base_user import BaseUserManager


class UsuarioManager(BaseUserManager):
    def get_queryset(self):
        return super().get_queryset().select_related('rol', 'estado_cuenta')

    def get_by_natural_key(self, correo):
        # El login acepta el correo con cualquier combinación de mayúsculas.
        return self.get(correo__iexact=correo)

    def _resolver_catalogo(self, campo, valor):
        # Permite pasar el código del catálogo ('propietario') en vez de la instancia.
        if isinstance(valor, str):
            return self.model._meta.get_field(campo).related_model.por_codigo(valor)
        return valor

    def create_user(self, correo, contrasena=None, **campos_extra):
        if not correo:
            raise ValueError('El usuario debe tener un correo electrónico.')
        # createsuperuser de Django envía la clave como 'password'; sin esto se guardaría inutilizable.
        contrasena = campos_extra.pop('password', None) or contrasena
        correo = self.normalize_email(correo).lower()
        campos_extra['rol'] = self._resolver_catalogo('rol', campos_extra['rol'])
        campos_extra['estado_cuenta'] = self._resolver_catalogo(
            'estado_cuenta', campos_extra.get('estado_cuenta', 'activo'),
        )
        usuario = self.model(correo=correo, **campos_extra)
        usuario.set_password(contrasena)
        usuario.full_clean(exclude=['password'])
        usuario.save(using=self._db)
        return usuario

    def create_superuser(self, correo, contrasena=None, **campos_extra):
        campos_extra.setdefault('rol', 'administrador')
        campos_extra.setdefault('is_staff', True)
        campos_extra.setdefault('is_superuser', True)
        campos_extra.setdefault('nombre', 'Admin')
        campos_extra.setdefault('apellido', 'Mudate Acá')
        campos_extra.setdefault('celular', '000000000')

        if campos_extra.get('is_staff') is not True:
            raise ValueError('El superusuario debe tener is_staff=True.')
        if campos_extra.get('is_superuser') is not True:
            raise ValueError('El superusuario debe tener is_superuser=True.')

        return self.create_user(correo, contrasena, **campos_extra)
