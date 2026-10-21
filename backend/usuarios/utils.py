import email.policy

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

# Con la política por defecto (max_line_length=78), Django envuelve el cuerpo en
# quoted-printable y corta las líneas largas, lo que corrompe enlaces largos
# (como el de recuperación) al copiarlos desde la consola. Subimos el límite para
# que el cuerpo se mande en 8bit, sin cortes ni "=3D" en medio de la URL.
_POLITICA_SIN_CORTES = email.policy.default.clone(max_line_length=1000)


class _CorreoSinCortesDeLinea(EmailMultiAlternatives):
    def message(self):
        return super().message(policy=_POLITICA_SIN_CORTES)


def enviar_correo(asunto, cuerpo, destinatarios):
    mensaje = _CorreoSinCortesDeLinea(asunto, cuerpo, settings.DEFAULT_FROM_EMAIL, destinatarios)
    mensaje.send(using='default')
