from django.db import migrations

ESTADOS_BUSQUEDA = [
    ('activa', 'Activa'),
    ('pausada', 'Pausada'),
]


def crear_catalogo(apps, schema_editor):
    EstadoBusqueda = apps.get_model('busquedas', 'EstadoBusqueda')
    for codigo, nombre in ESTADOS_BUSQUEDA:
        EstadoBusqueda.objects.create(codigo=codigo, nombre=nombre)


class Migration(migrations.Migration):

    dependencies = [
        ('busquedas', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(crear_catalogo, migrations.RunPython.noop),
    ]
