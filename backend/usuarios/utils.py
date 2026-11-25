import email.policy

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

# Con la política por defecto (max_line_length=78), Django envuelve el cuerpo en
# quoted-printable y corta las líneas largas, lo que corrompe enlaces largos
# (como el de recuperación). Subimos el límite al máximo que permite el estándar
# (RFC 5322) para que el cuerpo se mande en 8bit, sin cortes ni "=3D" en la URL.
LARGO_MAXIMO_DE_LINEA = 998


class _CorreoSinCortesDeLinea(EmailMultiAlternatives):
    def message(self, *, policy=email.policy.default):
        # El backend SMTP pide su propia política (con saltos de línea \r\n): se respeta
        # y solo se cambia el largo de línea.
        return super().message(policy=policy.clone(max_line_length=LARGO_MAXIMO_DE_LINEA))


def enviar_correo(asunto, cuerpo, destinatarios):
    mensaje = _CorreoSinCortesDeLinea(asunto, cuerpo, settings.DEFAULT_FROM_EMAIL, destinatarios)
    mensaje.send(using='default')
