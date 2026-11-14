# Pruebas unitarias de reglas de negocio: cada función se prueba sola, sin base de datos ni API.
from datetime import date
from types import SimpleNamespace

from django.test import SimpleTestCase

from config.texto import normalizar_texto

from .estados import acciones_permitidas
from .filtros import cubre_estadia, dias_de_estadia


class AccionesPermitidasTests(SimpleTestCase):
    def test_una_activa_tiene_todas_las_acciones(self):
        self.assertEqual(
            acciones_permitidas('activa'),
            ['editar', 'pausar', 'reservar', 'marcar_alquilada', 'eliminar'],
        )

    def test_una_pausada_se_edita_se_reactiva_o_se_elimina(self):
        self.assertEqual(acciones_permitidas('pausada'), ['editar', 'reactivar', 'eliminar'])

    def test_los_estados_cerrados_solo_se_eliminan(self):
        for estado in ('archivada', 'oculta'):
            with self.subTest(estado=estado):
                self.assertEqual(acciones_permitidas(estado), ['eliminar'])

    def test_una_eliminada_no_tiene_acciones(self):
        self.assertEqual(acciones_permitidas('eliminada'), [])


class EstadiaTests(SimpleTestCase):
    def publicacion(self, hasta=date(2026, 12, 20)):
        # Un temporario disponible del 1 al 20 de diciembre, con una estadía mínima de 7 días.
        return SimpleNamespace(disponible_desde=date(2026, 12, 1), disponible_hasta=hasta, duracion_minima_dias=7)

    def test_cubre_una_estadia_dentro_de_la_disponibilidad(self):
        self.assertTrue(cubre_estadia(self.publicacion(), date(2026, 12, 5), date(2026, 12, 15), None))

    def test_no_cubre_una_estadia_que_se_sale_de_las_fechas(self):
        self.assertFalse(cubre_estadia(self.publicacion(), date(2026, 12, 15), date(2026, 12, 25), None))
        self.assertFalse(cubre_estadia(self.publicacion(), date(2026, 11, 25), date(2026, 12, 5), None))

    def test_no_cubre_una_estadia_menor_a_la_duracion_minima(self):
        self.assertFalse(cubre_estadia(self.publicacion(), date(2026, 12, 5), date(2026, 12, 8), None))

    def test_sin_fecha_final_cualquier_salida_queda_cubierta(self):
        self.assertTrue(cubre_estadia(self.publicacion(hasta=None), date(2027, 3, 1), date(2027, 3, 15), None))

    def test_calcula_los_dias_de_estadia(self):
        self.assertEqual(dias_de_estadia(date(2026, 12, 5), date(2026, 12, 15), None), 10)
        self.assertEqual(dias_de_estadia(date(2026, 12, 5), date(2026, 12, 15), 3), 3)
        self.assertIsNone(dias_de_estadia(date(2026, 12, 5), None, None))


class NormalizarTextoTests(SimpleTestCase):
    def test_quita_acentos_y_mayusculas(self):
        self.assertEqual(normalizar_texto('Trenque Lauquén'), 'trenque lauquen')
        self.assertEqual(normalizar_texto('LAUQUEN'), normalizar_texto('Lauquén'))

    def test_quita_los_espacios_de_los_extremos(self):
        self.assertEqual(normalizar_texto('  Centro  '), 'centro')
