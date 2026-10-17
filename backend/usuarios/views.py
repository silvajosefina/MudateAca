from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Usuario
from .serializers import (
    ConfirmarRecuperacionSerializer,
    LoginSerializer,
    RegistroSerializer,
    SolicitarRecuperacionSerializer,
    UsuarioSerializer,
)
from .utils import enviar_correo


def _establecer_cookies_tokens(response, *, access=None, refresh=None):
    comun = dict(
        httponly=True,
        secure=settings.JWT_COOKIE_SECURE,
        samesite=settings.JWT_COOKIE_SAMESITE,
        path='/',
    )
    if access is not None:
        response.set_cookie(
            settings.JWT_ACCESS_COOKIE, access,
            max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
            **comun,
        )
    if refresh is not None:
        response.set_cookie(
            settings.JWT_REFRESH_COOKIE, refresh,
            max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
            **comun,
        )


def _borrar_cookies_tokens(response):
    response.delete_cookie(settings.JWT_ACCESS_COOKIE, path='/')
    response.delete_cookie(settings.JWT_REFRESH_COOKIE, path='/')


class RegistroView(generics.CreateAPIView):
    queryset = Usuario.objects.all()
    serializer_class = RegistroSerializer
    permission_classes = [AllowAny]
    throttle_scope = 'auth_sensible'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()
        return Response(UsuarioSerializer(usuario).data, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]
    throttle_scope = 'auth_sensible'

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = serializer.validated_data

        respuesta = Response(UsuarioSerializer(serializer.user).data)
        _establecer_cookies_tokens(respuesta, access=str(datos['access']), refresh=str(datos['refresh']))
        return respuesta


class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        token_crudo = request.COOKIES.get(settings.JWT_REFRESH_COOKIE)
        if not token_crudo:
            return Response({'detail': 'No hay sesión activa.'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            refresh = RefreshToken(token_crudo)
            if settings.SIMPLE_JWT['BLACKLIST_AFTER_ROTATION']:
                refresh.blacklist()
            nuevo_refresh = RefreshToken.for_user(Usuario.objects.get(id=refresh['user_id']))
        except (TokenError, Usuario.DoesNotExist):
            return Response({'detail': 'Sesión inválida o vencida.'}, status=status.HTTP_401_UNAUTHORIZED)

        respuesta = Response({'detail': 'Token renovado.'})
        _establecer_cookies_tokens(
            respuesta, access=str(nuevo_refresh.access_token), refresh=str(nuevo_refresh),
        )
        return respuesta


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        token_crudo = request.COOKIES.get(settings.JWT_REFRESH_COOKIE)
        if token_crudo:
            try:
                RefreshToken(token_crudo).blacklist()
            except TokenError:
                pass

        respuesta = Response({'detail': 'Sesión cerrada.'})
        _borrar_cookies_tokens(respuesta)
        return respuesta


class PerfilView(generics.RetrieveAPIView):
    serializer_class = UsuarioSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class SolicitarRecuperacionView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth_sensible'

    def post(self, request, *args, **kwargs):
        serializer = SolicitarRecuperacionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        correo = serializer.validated_data['correo'].lower()

        usuario = Usuario.objects.filter(correo=correo).first()
        if usuario is not None:
            uid = urlsafe_base64_encode(force_bytes(usuario.pk))
            token = default_token_generator.make_token(usuario)
            enlace = f'{settings.FRONTEND_URL}/restablecer-contrasena?uid={uid}&token={token}'
            enviar_correo(
                'Recuperá tu cuenta de Mudate Acá',
                f'Para elegir una nueva contraseña, abrí este enlace (válido por un tiempo limitado): {enlace}',
                [usuario.correo],
            )

        # Respuesta genérica siempre, para no revelar si un correo está registrado.
        return Response({'detail': 'Si el correo existe, te enviamos instrucciones para recuperar tu cuenta.'})


class ConfirmarRecuperacionView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = 'auth_sensible'

    def post(self, request, *args, **kwargs):
        serializer = ConfirmarRecuperacionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = serializer.validated_data

        try:
            uid = force_str(urlsafe_base64_decode(datos['uid']))
            usuario = Usuario.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, Usuario.DoesNotExist):
            usuario = None

        if usuario is None or not default_token_generator.check_token(usuario, datos['token']):
            raise ValidationError({'detail': 'El enlace de recuperación no es válido o venció.'})

        usuario.set_password(datos['nueva_contrasena'])
        usuario.save(update_fields=['password'])
        return Response({'detail': 'Contraseña actualizada. Ya podés iniciar sesión.'})
