from pathlib import Path

from django.conf import settings
from django.core.management import get_commands
from django.test import SimpleTestCase

ARCHIVO_CRON = Path(settings.BASE_DIR) / 'cron' / 'mudateaca.crontab'


def tareas_programadas():
    # Cada tarea es una línea con 5 campos de horario y el comando; se ignoran comentarios y variables.
    tareas = []
    for linea in ARCHIVO_CRON.read_text(encoding='utf-8').splitlines():
        linea = linea.strip()
        if not linea or linea.startswith('#') or '=' in linea.split()[0]:
            continue
        campos = linea.split(maxsplit=5)
        tareas.append({'horario': campos[:5], 'comando': campos[5]})
    return tareas


class ArchivoCronTests(SimpleTestCase):
    def test_programa_el_archivado_y_la_copia_de_seguridad(self):
        comandos = [tarea['comando'] for tarea in tareas_programadas()]

        self.assertEqual(len(comandos), 2)
        self.assertIn('manage.py archivar_publicaciones', comandos[0])
        self.assertIn('manage.py respaldar_base', comandos[1])

    def test_las_dos_tareas_corren_todos_los_dias(self):
        for tarea in tareas_programadas():
            with self.subTest(comando=tarea['comando']):
                minuto, hora, dia, mes, dia_semana = tarea['horario']
                self.assertTrue(minuto.isdigit() and hora.isdigit())
                self.assertEqual((dia, mes, dia_semana), ('*', '*', '*'))

    def test_los_comandos_programados_existen(self):
        existentes = get_commands()
        for tarea in tareas_programadas():
            nombre = tarea['comando'].split('manage.py ')[1].split()[0]
            with self.subTest(comando=nombre):
                self.assertIn(nombre, existentes)
