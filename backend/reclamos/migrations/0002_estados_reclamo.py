from django.db import migrations

ESTADOS_RECLAMO = [
    ('pendiente', 'Pendiente'),
    ('en_revision', 'En revisión'),
    ('resuelto', 'Resuelto'),
    ('descartado', 'Descartado'),
]


def crear_catalogo(apps, schema_editor):
    EstadoReclamo = apps.get_model('reclamos', 'EstadoReclamo')
    for codigo, nombre in ESTADOS_RECLAMO:
        EstadoReclamo.objects.create(codigo=codigo, nombre=nombre)


class Migration(migrations.Migration):

    dependencies = [
        ('reclamos', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(crear_catalogo, migrations.RunPython.noop),
    ]
