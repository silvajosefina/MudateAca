from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken


class CookieJWTAuthentication(JWTAuthentication):
    # Lee el access token de una cookie httpOnly en vez del header Authorization.

    def authenticate(self, request):
        token_crudo = request.COOKIES.get(settings.JWT_ACCESS_COOKIE)
        if token_crudo is None:
            return None
        try:
            token_validado = self.get_validated_token(token_crudo)
        except InvalidToken:
            return None
        return self.get_user(token_validado), token_validado
