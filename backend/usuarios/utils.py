from django.conf import settings
from django.core.mail import EmailMultiAlternatives


def enviar_correo(asunto, cuerpo, destinatarios):
    mensaje = EmailMultiAlternatives(asunto, cuerpo, settings.DEFAULT_FROM_EMAIL, destinatarios)
    mensaje.send(using='default')
