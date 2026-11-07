from django.http import Http404
from rest_framework.exceptions import NotFound
from rest_framework.views import exception_handler


def manejar_excepcion(exc, context):
    # Django arma el 404 en inglés y con el nombre interno del modelo ("No Conversacion matches...").
    if isinstance(exc, Http404):
        exc = NotFound('No se encontró el recurso solicitado.')
    return exception_handler(exc, context)
