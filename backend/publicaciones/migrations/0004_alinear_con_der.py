import django.contrib.gis.db.models.fields
import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

ESTADOS_PUBLICACION = [
    ('pendiente_moderacion', 'Pendiente de moderación'),
    ('activa', 'Activa'),
    ('pausada', 'Pausada'),
    ('observada', 'Observada'),
    ('reservada', 'Reservada'),
    ('rechazada', 'Rechazada'),
    ('alquilada', 'Alquilada'),
    ('archivada', 'Archivada'),
    ('eliminada', 'Eliminada'),
]

TIPOS_INMUEBLE = [
    ('casa', 'Casa'),
    ('departamento', 'Departamento'),
    ('habitacion', 'Habitación'),
    ('residencia', 'Residencia'),
]

MODALIDADES = [
    ('residencial', 'Residencial'),
    ('temporario', 'Temporario'),
]


def crear_catalogos(apps, schema_editor):
    for modelo, filas in (
        ('EstadoPublicacion', ESTADOS_PUBLICACION),
        ('TipoInmueble', TIPOS_INMUEBLE),
        ('Modalidad', MODALIDADES),
    ):
        Catalogo = apps.get_model('publicaciones', modelo)
        for codigo, nombre in filas:
            Catalogo.objects.create(codigo=codigo, nombre=nombre)


def pasar_textos_a_catalogos(apps, schema_editor):
    Publicacion = apps.get_model('publicaciones', 'Publicacion')
    for campo, modelo in (
        ('estado', 'EstadoPublicacion'),
        ('tipo_inmueble', 'TipoInmueble'),
        ('modalidad', 'Modalidad'),
    ):
        for fila in apps.get_model('publicaciones', modelo).objects.all():
            Publicacion.objects.filter(**{f'{campo}_texto': fila.codigo}).update(**{campo: fila})


def catalogo(relacion, destino, nulo):
    return models.ForeignKey(
        null=nulo, on_delete=django.db.models.deletion.PROTECT, related_name=relacion, to=destino,
    )


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('publicaciones', '0003_validar_formato_archivo_verificacion'),
        ('usuarios', '0002_catalogos_y_suspensiones'),
    ]

    operations = [
        migrations.CreateModel(
            name='EstadoPublicacion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('codigo', models.CharField(max_length=30, unique=True)),
                ('nombre', models.CharField(max_length=50)),
            ],
            options={
                'verbose_name': 'estado de publicación',
                'verbose_name_plural': 'estados de publicación',
                'db_table': 'estado_publicacion',
                'ordering': ['id'],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='TipoInmueble',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('codigo', models.CharField(max_length=30, unique=True)),
                ('nombre', models.CharField(max_length=50)),
            ],
            options={
                'verbose_name': 'tipo de inmueble',
                'verbose_name_plural': 'tipos de inmueble',
                'db_table': 'tipo_inmueble',
                'ordering': ['id'],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Modalidad',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('codigo', models.CharField(max_length=30, unique=True)),
                ('nombre', models.CharField(max_length=50)),
            ],
            options={
                'verbose_name': 'modalidad',
                'verbose_name_plural': 'modalidades',
                'db_table': 'modalidad',
                'ordering': ['id'],
                'abstract': False,
            },
        ),
        migrations.RunPython(crear_catalogos, migrations.RunPython.noop),

        migrations.RenameField(model_name='publicacion', old_name='estado', new_name='estado_texto'),
        migrations.RenameField(model_name='publicacion', old_name='tipo_inmueble', new_name='tipo_inmueble_texto'),
        migrations.RenameField(model_name='publicacion', old_name='modalidad', new_name='modalidad_texto'),
        migrations.AddField(
            model_name='publicacion',
            name='estado',
            field=catalogo('publicaciones', 'publicaciones.estadopublicacion', nulo=True),
        ),
        migrations.AddField(
            model_name='publicacion',
            name='tipo_inmueble',
            field=catalogo('publicaciones', 'publicaciones.tipoinmueble', nulo=True),
        ),
        migrations.AddField(
            model_name='publicacion',
            name='modalidad',
            field=catalogo('publicaciones', 'publicaciones.modalidad', nulo=True),
        ),
        migrations.RunPython(pasar_textos_a_catalogos, migrations.RunPython.noop),

        # Las FK diferidas que acaban de escribirse impiden alterar la tabla en la misma transacción.
        migrations.RunSQL('SET CONSTRAINTS ALL IMMEDIATE', migrations.RunSQL.noop),

        migrations.RemoveField(model_name='publicacion', name='estado_texto'),
        migrations.RemoveField(model_name='publicacion', name='tipo_inmueble_texto'),
        migrations.RemoveField(model_name='publicacion', name='modalidad_texto'),
        migrations.AlterField(
            model_name='publicacion',
            name='estado',
            field=catalogo('publicaciones', 'publicaciones.estadopublicacion', nulo=False),
        ),
        migrations.AlterField(
            model_name='publicacion',
            name='tipo_inmueble',
            field=catalogo('publicaciones', 'publicaciones.tipoinmueble', nulo=False),
        ),
        migrations.AlterField(
            model_name='publicacion',
            name='modalidad',
            field=catalogo('publicaciones', 'publicaciones.modalidad', nulo=False),
        ),

        # El motivo y la nota ya están en EVENTO_MODERACION: el DER no los duplica en la publicación.
        migrations.RemoveField(model_name='publicacion', name='motivo_rechazo_verificacion'),
        migrations.RemoveField(model_name='publicacion', name='nota_moderacion'),

        migrations.AddField(
            model_name='publicacion',
            name='expensas',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name='publicacion',
            name='coordenadas',
            field=django.contrib.gis.db.models.fields.PointField(blank=True, geography=True, null=True, srid=4326),
        ),
        migrations.AddField(
            model_name='publicacion',
            name='amueblado',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='publicacion',
            name='servicios_incluidos',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='publicacion',
            name='acepta_mascotas',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='publicacion',
            name='apto_estudiantes',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='publicacion',
            name='requisitos',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='publicacion',
            name='duracion_minima_dias',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='publicacion',
            name='disponible_hasta',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='publicacion',
            name='alquilada_en',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='publicacion',
            name='propietario',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='publicaciones',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name='publicacion',
            name='archivo_verificacion',
            field=models.FileField(
                db_column='archivo_verificacion_url',
                max_length=255,
                upload_to='verificaciones/',
                validators=[
                    django.core.validators.FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'jpeg', 'png']),
                ],
            ),
        ),
        migrations.AlterField(
            model_name='fotopublicacion',
            name='imagen',
            field=models.ImageField(db_column='imagen_url', max_length=255, upload_to='publicaciones/'),
        ),
        migrations.AddField(
            model_name='eventomoderacion',
            name='administrador',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='eventos_moderacion',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name='eventomoderacion',
            name='tipo',
            field=models.CharField(
                choices=[
                    ('rechazo', 'Rechazada'),
                    ('solicitud_modificacion', 'Modificaciones solicitadas'),
                    ('moderacion_automatica', 'Observada por la moderación automática'),
                ],
                max_length=30,
            ),
        ),
        migrations.AlterModelTable(name='publicacion', table='publicacion'),
        migrations.AlterModelTable(name='fotopublicacion', table='foto_publicacion'),
        migrations.AlterModelTable(name='eventomoderacion', table='evento_moderacion'),
    ]
