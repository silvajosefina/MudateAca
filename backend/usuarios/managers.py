from django.contrib.auth.base_user import BaseUserManager


class UsuarioManager(BaseUserManager):
    def create_user(self, correo, contrasena=None, **campos_extra):
        if not correo:
            raise ValueError('El usuario debe tener un correo electrónico.')
        correo = self.normalize_email(correo)
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
