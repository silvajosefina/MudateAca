import shutil
import subprocess
import tempfile
from datetime import datetime, timedelta, timezone as tz
from io import StringIO
from pathlib import Path
from unittest import mock

from django.core.management import CommandError, call_command
from django.test import SimpleTestCase, override_settings
from django.utils import timezone

from . import servicios


def simular_pg(codigo_dump=0, codigo_verificacion=0):
    # Imita pg_dump (crea el archivo indicado en --file) y pg_restore --list.
    def ejecutar(comando, **kwargs):
        if '--file' in comando:
            Path(comando[comando.index('--file') + 1]).write_bytes(b'PGDMP copia de prueba')
            return subprocess.CompletedProcess(comando, codigo_dump, '', 'error de pg_dump' if codigo_dump else '')
        return subprocess.CompletedProcess(comando, codigo_verificacion, '', 'archivo dañado' if codigo_verificacion else '')
    return mock.patch('respaldos.servicios.subprocess.run', side_effect=ejecutar)


class PruebaDeRespaldos(SimpleTestCase):
    def setUp(self):
        self.carpeta = Path(tempfile.mkdtemp())
        self.ajustes = override_settings(RESPALDOS_DIR=str(self.carpeta), PG_BIN_DIR='', USAR_CLOUDINARY=False)
        self.ajustes.enable()

    def tearDown(self):
        self.ajustes.disable()
        shutil.rmtree(self.carpeta, ignore_errors=True)

    def copias(self):
        return sorted(archivo.name for archivo in self.carpeta.iterdir())

    def respaldar(self):
        salida = StringIO()
        call_command('respaldar_base', stdout=salida)
        return salida.getvalue()


class CrearRespaldoTests(PruebaDeRespaldos):
    def test_genera_una_copia_verificada_con_fecha(self):
        with simular_pg() as ejecutar:
            salida = self.respaldar()

        self.assertEqual(len(self.copias()), 1)
        self.assertRegex(self.copias()[0], r'^mudateaca_\d{8}_\d{6}\.dump$')
        self.assertIn('Copia generada y verificada', salida)
        programas = [llamada.args[0][0] for llamada in ejecutar.call_args_list]
        self.assertEqual(programas, ['pg_dump', 'pg_restore'])

    def test_usa_formato_propio_de_postgres_y_no_pasa_la_clave_por_argumentos(self):
        with simular_pg() as ejecutar:
            self.respaldar()

        comando = ejecutar.call_args_list[0].args[0]
        self.assertIn('--format=custom', comando)
        self.assertIn('PGPASSWORD', ejecutar.call_args_list[0].kwargs['env'])
        self.assertNotIn(ejecutar.call_args_list[0].kwargs['env']['PGPASSWORD'], comando)

    def test_si_pg_dump_falla_no_deja_una_copia_a_medias(self):
        with simular_pg(codigo_dump=1), self.assertRaisesMessage(CommandError, 'pg_dump no pudo generar la copia'):
            self.respaldar()

        self.assertEqual(self.copias(), [])

    def test_descarta_una_copia_que_no_se_puede_leer(self):
        with simular_pg(codigo_verificacion=1), self.assertRaisesMessage(CommandError, 'no se puede leer'):
            self.respaldar()

        self.assertEqual(self.copias(), [])

    def test_avisa_si_la_copia_solo_quedo_en_el_equipo(self):
        with simular_pg():
            salida = self.respaldar()

        self.assertIn('Cloudinary no está configurado', salida)

    @override_settings(PG_BIN_DIR='C:/PostgreSQL/18/bin')
    def test_usa_la_carpeta_de_postgres_configurada(self):
        with simular_pg() as ejecutar:
            self.respaldar()

        self.assertEqual(Path(ejecutar.call_args_list[0].args[0][0]), Path('C:/PostgreSQL/18/bin/pg_dump'))


class RetencionTests(PruebaDeRespaldos):
    def crear_copia(self, dias_atras, ahora):
        nombre = f"mudateaca_{(ahora - timedelta(days=dias_atras)).strftime('%Y%m%d_%H%M%S')}.dump"
        (self.carpeta / nombre).write_bytes(b'PGDMP')
        return nombre

    def test_conserva_siete_dias_de_copias_locales(self):
        ahora = timezone.localtime()
        recientes = [self.crear_copia(dias, ahora) for dias in (0, 3, 6)]
        viejas = [self.crear_copia(dias, ahora) for dias in (8, 30)]
        (self.carpeta / 'notas.txt').write_text('no es una copia')

        borradas = servicios.limpiar_copias_locales(ahora)

        self.assertEqual(sorted(borradas), sorted(viejas))
        self.assertEqual(self.copias(), sorted([*recientes, 'notas.txt']))

    def test_conserva_siete_dias_de_copias_en_la_nube(self):
        ahora = datetime(2026, 11, 13, 12, tzinfo=tz.utc)
        recursos = {'resources': [
            {'public_id': 'respaldos/nueva.dump', 'created_at': '2026-11-12T03:00:00Z'},
            {'public_id': 'respaldos/vieja.dump', 'created_at': '2026-11-01T03:00:00Z'},
        ]}
        with mock.patch('cloudinary.api.resources', return_value=recursos) as listar, \
                mock.patch('cloudinary.api.delete_resources') as borrar:
            borradas = servicios.limpiar_copias_en_la_nube(ahora)

        self.assertEqual(borradas, ['respaldos/vieja.dump'])
        self.assertEqual(listar.call_args.kwargs['type'], 'authenticated')
        borrar.assert_called_once_with(['respaldos/vieja.dump'], resource_type='raw', type='authenticated')


class SubidaALaNubeTests(PruebaDeRespaldos):
    @override_settings(USAR_CLOUDINARY=True)
    def test_sube_la_copia_como_archivo_privado(self):
        with simular_pg(), mock.patch('cloudinary.uploader.upload') as subir, \
                mock.patch('cloudinary.api.resources', return_value={'resources': []}):
            salida = self.respaldar()

        opciones = subir.call_args.kwargs
        self.assertEqual((opciones['type'], opciones['resource_type']), ('authenticated', 'raw'))
        self.assertEqual(opciones['public_id'], f'respaldos/{self.copias()[0]}')
        self.assertIn('Copia subida a Cloudinary', salida)

    @override_settings(USAR_CLOUDINARY=True)
    def test_si_falla_la_subida_conserva_la_copia_local(self):
        with simular_pg(), mock.patch('cloudinary.uploader.upload', side_effect=OSError('sin conexión')), \
                self.assertRaisesMessage(CommandError, 'no se pudo subir a Cloudinary'):
            self.respaldar()

        self.assertEqual(len(self.copias()), 1)
