from .models import RegistroAuditoria


def registrar_accion(actor, tipo_accion, referencia, detalle=''):
    return RegistroAuditoria.objects.create(
        actor=actor, tipo_accion=tipo_accion, referencia=referencia, detalle=detalle,
    )
