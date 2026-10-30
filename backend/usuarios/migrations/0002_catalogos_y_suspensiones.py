import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

ROLES = [
    ('interesado', 'Interesado'),
    ('propietario', 'Propietario'),
    ('inmobiliaria', 'Inmobiliaria'),
    ('administrador', 'Administrador'),
]

ESTADOS_CUENTA = [
    ('activo', 'Activo'),
    ('suspendido', 'Suspendido'),
]


def crear_catalogos(apps, schema_editor):
    Rol = apps.get_model('usuarios', 'Rol')
    EstadoCuenta = apps.get_model('usuarios', 'EstadoCuenta')
    for codigo, nombre in ROLES:
        Rol.objects.create(codigo=codigo, nombre=nombre)
    for codigo, nombre in ESTADOS_CUENTA:
        EstadoCuenta.objects.create(codigo=codigo, nombre=nombre)


def pasar_textos_a_catalogos(apps, schema_editor):
    Usuario = apps.get_model('usuarios', 'Usuario')
    Rol = apps.get_model('usuarios', 'Rol')
    EstadoCuenta = apps.get_model('usuarios', 'EstadoCuenta')
    for rol in Rol.objects.all():
        Usuario.objects.filter(rol_texto=rol.codigo).update(rol=rol)
    for estado in EstadoCuenta.objects.all():
        Usuario.objects.filter(estado_cuenta_texto=estado.codigo).update(estado_cuenta=estado)


def pasar_motivos_a_suspensiones(apps, schema_editor):
    Usuario = apps.get_model('usuarios', 'Usuario')
    Suspension = apps.get_model('usuarios', 'Suspension')
    for usuario in Usuario.objects.filter(estado_cuenta_texto='suspendido'):
        Suspension.objects.create(usuario=usuario, motivo=usuario.motivo_suspension or '')


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='EstadoCuenta',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('codigo', models.CharField(max_length=30, unique=True)),
                ('nombre', models.CharField(max_length=50)),
            ],
            options={
                'verbose_name': 'estado de cuenta',
                'verbose_name_plural': 'estados de cuenta',
                'db_table': 'estado_cuenta',
                'ordering': ['id'],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Rol',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('codigo', models.CharField(max_length=30, unique=True)),
                ('nombre', models.CharField(max_length=50)),
            ],
            options={
                'verbose_name': 'rol',
                'verbose_name_plural': 'roles',
                'db_table': 'rol',
                'ordering': ['id'],
                'abstract': False,
            },
        ),
        migrations.RunPython(crear_catalogos, migrations.RunPython.noop),

        migrations.RenameField(model_name='usuario', old_name='rol', new_name='rol_texto'),
        migrations.RenameField(model_name='usuario', old_name='estado_cuenta', new_name='estado_cuenta_texto'),
        migrations.AddField(
            model_name='usuario',
            name='rol',
            field=models.ForeignKey(
                null=True, on_delete=django.db.models.deletion.PROTECT, related_name='usuarios', to='usuarios.rol',
            ),
        ),
        migrations.AddField(
            model_name='usuario',
            name='estado_cuenta',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='usuarios',
                to='usuarios.estadocuenta',
            ),
        ),
        migrations.RunPython(pasar_textos_a_catalogos, migrations.RunPython.noop),

        migrations.CreateModel(
            name='Suspension',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('motivo', models.TextField()),
                ('creado_en', models.DateTimeField(auto_now_add=True)),
                ('levantada_en', models.DateTimeField(blank=True, null=True)),
                (
                    'administrador',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='suspensiones_aplicadas',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    'usuario',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='suspensiones',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'verbose_name': 'suspensión',
                'verbose_name_plural': 'suspensiones',
                'db_table': 'suspension',
                'ordering': ['-creado_en'],
            },
        ),
        migrations.RunPython(pasar_motivos_a_suspensiones, migrations.RunPython.noop),

        # Las FK diferidas que acaban de escribirse impiden alterar la tabla en la misma transacción.
        migrations.RunSQL('SET CONSTRAINTS ALL IMMEDIATE', migrations.RunSQL.noop),

        migrations.RemoveField(model_name='usuario', name='rol_texto'),
        migrations.RemoveField(model_name='usuario', name='estado_cuenta_texto'),
        migrations.RemoveField(model_name='usuario', name='motivo_suspension'),
        migrations.AlterField(
            model_name='usuario',
            name='rol',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT, related_name='usuarios', to='usuarios.rol',
            ),
        ),
        migrations.AlterField(
            model_name='usuario',
            name='estado_cuenta',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT, related_name='usuarios', to='usuarios.estadocuenta',
            ),
        ),
        migrations.RenameField(model_name='usuario', old_name='date_joined', new_name='fecha_registro'),
        migrations.AddField(
            model_name='usuario',
            name='razon_social',
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
        migrations.AlterModelTable(name='usuario', table='usuario'),
    ]
