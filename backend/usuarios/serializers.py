from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Usuario
from .validators import validador_contrasena

ROLES_REGISTRABLES = ('interesado', 'propietario', 'inmobiliaria')


class RegistroSerializer(serializers.ModelSerializer):
    contrasena = serializers.CharField(write_only=True, validators=[validador_contrasena])

    class Meta:
        model = Usuario
        fields = ['id', 'nombre', 'apellido', 'celular', 'correo', 'contrasena', 'rol']

    def validate_rol(self, rol):
        if rol not in ROLES_REGISTRABLES:
            raise serializers.ValidationError('El rol elegido no es válido para el registro.')
        return rol

    def validate_correo(self, correo):
        correo = correo.lower()
        if Usuario.objects.filter(correo=correo).exists():
            raise serializers.ValidationError('Este correo ya está registrado.')
        return correo

    def validate_contrasena(self, contrasena):
        validate_password(contrasena)
        return contrasena

    def create(self, datos_validados):
        contrasena = datos_validados.pop('contrasena')
        return Usuario.objects.create_user(contrasena=contrasena, **datos_validados)


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'nombre', 'apellido', 'celular', 'correo', 'rol', 'estado_cuenta', 'motivo_suspension']
        read_only_fields = fields


class LoginSerializer(TokenObtainPairSerializer):
    """
    Extiende la validación estándar de SimpleJWT para:
    - usar 'contrasena' en vez de 'password', consistente con el resto de la API.
    - bloquear el login de cuentas suspendidas e informar el motivo (RF-20),
      en vez de depender de is_active (que no distingue el motivo de bloqueo).
    """

    default_error_messages = {'no_active_account': 'Usuario o contraseña incorrectos.'}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        campo_contrasena = self.fields.pop('password')
        campo_contrasena.source = None  # limpia el 'password' del bind original para que se recalcule
        self.fields['contrasena'] = campo_contrasena

    def validate(self, atributos):
        atributos['password'] = atributos.pop('contrasena')
        datos = super().validate(atributos)
        if self.user.estado_cuenta == 'suspendido':
            raise serializers.ValidationError(
                f'Tu cuenta está suspendida. Motivo: {self.user.motivo_suspension}'
            )
        return datos


class SolicitarRecuperacionSerializer(serializers.Serializer):
    correo = serializers.EmailField()


class ConfirmarRecuperacionSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    nueva_contrasena = serializers.CharField(validators=[validador_contrasena])

    def validate_nueva_contrasena(self, contrasena):
        validate_password(contrasena)
        return contrasena
