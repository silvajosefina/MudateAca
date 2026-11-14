from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Rol, Suspension, Usuario
from .validators import validador_contrasena

ROLES_REGISTRABLES = ('interesado', 'propietario', 'inmobiliaria')


def validar_razon_social(datos, rol):
    # RF-21: las publicaciones de una inmobiliaria la identifican por su razón social.
    if rol != 'inmobiliaria':
        datos.pop('razon_social', None)
    elif not (datos.get('razon_social') or '').strip():
        raise serializers.ValidationError({'razon_social': ['Indicá la razón social de la inmobiliaria.']})
    return datos


class RegistroSerializer(serializers.ModelSerializer):
    contrasena = serializers.CharField(write_only=True, validators=[validador_contrasena])
    rol = serializers.SlugRelatedField(
        slug_field='codigo',
        queryset=Rol.objects.filter(codigo__in=ROLES_REGISTRABLES),
        error_messages={'does_not_exist': 'El rol elegido no es válido para el registro.'},
    )

    class Meta:
        model = Usuario
        fields = ['id', 'nombre', 'apellido', 'celular', 'correo', 'contrasena', 'rol', 'razon_social']
        # Sin esto, el UniqueValidator automático de DRF responde antes que
        # validate_correo con su propio mensaje genérico ("este/a correo").
        extra_kwargs = {'correo': {'validators': []}}

    def validate(self, datos):
        return validar_razon_social(datos, datos['rol'].codigo)

    def validate_correo(self, correo):
        correo = correo.lower()
        if Usuario.objects.filter(correo__iexact=correo).exists():
            raise serializers.ValidationError('Este correo ya está registrado.')
        return correo

    def validate_contrasena(self, contrasena):
        validate_password(contrasena)
        return contrasena

    def create(self, datos_validados):
        contrasena = datos_validados.pop('contrasena')
        return Usuario.objects.create_user(contrasena=contrasena, **datos_validados)


class UsuarioSerializer(serializers.ModelSerializer):
    rol = serializers.SlugRelatedField(slug_field='codigo', read_only=True)
    estado_cuenta = serializers.SlugRelatedField(slug_field='codigo', read_only=True)

    class Meta:
        model = Usuario
        fields = [
            'id', 'nombre', 'apellido', 'celular', 'correo', 'rol', 'razon_social', 'estado_cuenta', 'motivo_suspension',
        ]
        read_only_fields = fields


class PerfilSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['nombre', 'apellido', 'celular', 'razon_social']

    def validate(self, datos):
        if self.instance.rol.codigo == 'inmobiliaria' and 'razon_social' not in datos:
            return datos
        return validar_razon_social(datos, self.instance.rol.codigo)


class SuspensionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Suspension
        fields = ['id', 'motivo', 'creado_en', 'levantada_en']
        read_only_fields = fields


class UsuarioAdministracionSerializer(UsuarioSerializer):
    fecha_registro = serializers.DateTimeField(read_only=True)
    cantidad_publicaciones = serializers.IntegerField(read_only=True)
    reclamos_recibidos = serializers.IntegerField(source='cantidad_reclamos_recibidos', read_only=True)
    suspensiones = SuspensionSerializer(many=True, read_only=True)

    class Meta(UsuarioSerializer.Meta):
        fields = [
            *UsuarioSerializer.Meta.fields, 'fecha_registro', 'cantidad_publicaciones', 'reclamos_recibidos',
            'suspensiones',
        ]
        read_only_fields = fields


class FiltroUsuariosSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(choices=['activo', 'suspendido'], required=False)
    rol = serializers.ChoiceField(choices=list(ROLES_REGISTRABLES), required=False)
    busqueda = serializers.CharField(required=False, allow_blank=True, max_length=100)


class MotivoSuspensionSerializer(serializers.Serializer):
    motivo = serializers.CharField(max_length=2000)


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
        if self.user.esta_suspendido:
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
