from django.http import Http404, JsonResponse
from django.urls import Resolver404, resolve
from django.views.decorators.csrf import csrf_exempt
from rest_framework.exceptions import NotFound, ParseError, Throttled
from rest_framework.views import exception_handler

NO_ENCONTRADO = 'No se encontró el recurso solicitado.'


def manejar_excepcion(exc, context):
    # Django arma el 404 en inglés y con el nombre interno del modelo ("No Conversacion matches...").
    if isinstance(exc, Http404):
        exc = NotFound(NO_ENCONTRADO)
    # El error original incluye el detalle técnico del parser ("Expecting value: line 1 column 17...").
    elif isinstance(exc, ParseError):
        exc = ParseError('El cuerpo de la solicitud no tiene un formato válido.')
    # El mensaje por defecto dice "Solicitud fue regulada (throttled)".
    elif isinstance(exc, Throttled):
        exc = Throttled(wait=exc.wait, detail='Hiciste demasiados intentos.')
    return exception_handler(exc, context)


def error_del_servidor(request, *args, **kwargs):
    # RNF-10: con DEBUG apagado, un error inesperado no muestra la página de Django ni detalles internos.
    return JsonResponse(
        {'detail': 'Ocurrió un error inesperado. Intentá de nuevo más tarde.'},
        status=500,
        json_dumps_params={'ensure_ascii': False},
    )


def pagina_inexistente(request, exception=None):
    return JsonResponse({'detail': NO_ENCONTRADO}, status=404, json_dumps_params={'ensure_ascii': False})


@csrf_exempt
def ruta_inexistente(request, *args, **kwargs):
    # RNF-10: las rutas de la API que no existen responden en JSON y en español, nunca con la página de Django.
    detalle = NO_ENCONTRADO
    if not request.path.endswith('/'):
        try:
            if resolve(f'{request.path}/').func is not ruta_inexistente:
                detalle = f'La ruta debe terminar con "/": {request.path}/'
        except Resolver404:
            pass
    return JsonResponse({'detail': detalle}, status=404, json_dumps_params={'ensure_ascii': False})
