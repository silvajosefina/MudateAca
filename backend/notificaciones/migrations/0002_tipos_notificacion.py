from django.db import migrations

TIPOS_NOTIFICACION = [
    ('exito', 'Éxito'),
    ('error', 'Error'),
]


def crear_catalogo(apps, schema_editor):
    TipoNotificacion = apps.get_model('notificaciones', 'TipoNotificacion')
    for codigo, nombre in TIPOS_NOTIFICACION:
        TipoNotificacion.objects.create(codigo=codigo, nombre=nombre)


class Migration(migrations.Migration):

    dependencies = [
        ('notificaciones', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(crear_catalogo, migrations.RunPython.noop),
    ]
