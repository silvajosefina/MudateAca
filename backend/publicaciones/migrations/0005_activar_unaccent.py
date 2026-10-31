from django.contrib.postgres.operations import UnaccentExtension
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('publicaciones', '0004_alinear_con_der'),
    ]

    operations = [
        UnaccentExtension(),
    ]
