from .models import Notificacion, TipoNotificacion


def notificar(destinatarios, mensaje, tipo='exito', referencia=None):
    tipo_notificacion = TipoNotificacion.por_codigo(tipo)
    Notificacion.objects.bulk_create([
        Notificacion(usuario=usuario, tipo=tipo_notificacion, mensaje=mensaje, referencia=referencia)
        for usuario in destinatarios
    ])


def resumen(texto, largo=50):
    return texto if len(texto) <= largo else f'{texto[:largo].rstrip()}…'
