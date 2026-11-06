from django.urls import reverse
from rest_framework.test import APITestCase

from auditoria.models import RegistroAuditoria
from publicaciones.tests import crear_publicacion, crear_usuario

from .models import Reclamo


class PruebaDeReclamos(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.interesado = crear_usuario('interesado@mudateaca.com', rol='interesado')
        cls.otro_interesado = crear_usuario('otro.interesado@mudateaca.com', rol='interesado')
        cls.propietario = crear_usuario('propietario@mudateaca.com')
        cls.administrador = crear_usuario('admin@mudateaca.com', rol='administrador')
        cls.publicacion = crear_publicacion(cls.propietario)

    def setUp(self):
        self.client.force_authenticate(self.interesado)

    def reclamar(self, **datos):
        datos = {'motivo': 'enganosa', 'descripcion': 'Las fotos no corresponden.', **datos}
        if 'usuario_reportado' not in datos:
            datos.setdefault('publicacion', self.publicacion.id)
        return self.client.post(reverse('reclamo-lista'), datos, format='json')

    def cambiar_estado(self, reclamo_id, estado, **datos):
        self.client.force_authenticate(self.administrador)
        return self.client.post(reverse('reclamo-estado', args=[reclamo_id]), {'estado': estado, **datos}, format='json')


class CrearReclamoTests(PruebaDeReclamos):
    def test_reclama_sobre_una_publicacion(self):
        respuesta = self.reclamar()

        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.data['objetivo'], 'publicacion')
        self.assertEqual(respuesta.data['estado'], 'pendiente')
        self.assertEqual(Reclamo.objects.get().reclamante, self.interesado)

    def test_reclama_sobre_un_usuario(self):
        respuesta = self.reclamar(usuario_reportado=self.propietario.id, motivo='posible_estafa')

        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.data['objetivo'], 'usuario')
        self.assertEqual(respuesta.data['usuario_reportado']['id'], self.propietario.id)

    def test_los_motivos_dependen_del_objetivo(self):
        self.assertEqual(self.reclamar(motivo='posible_estafa').status_code, 400)
        self.assertEqual(self.reclamar(usuario_reportado=self.propietario.id, motivo='duplicada').status_code, 400)
        self.assertEqual(self.reclamar(motivo='inventado').status_code, 400)

    def test_exige_un_solo_objetivo_y_una_descripcion(self):
        url = reverse('reclamo-lista')
        base = {'motivo': 'otro', 'descripcion': 'Detalle'}

        self.assertEqual(self.client.post(url, base, format='json').status_code, 400)
        self.assertEqual(
            self.client.post(
                url, {**base, 'publicacion': self.publicacion.id, 'usuario_reportado': self.propietario.id},
                format='json',
            ).status_code,
            400,
        )
        self.assertEqual(self.reclamar(descripcion='').status_code, 400)
        self.assertEqual(self.reclamar(descripcion='a' * 2001).status_code, 400)

    def test_rechaza_objetivos_inexistentes(self):
        self.assertEqual(self.reclamar(publicacion=999999).status_code, 400)
        self.assertEqual(self.reclamar(usuario_reportado=999999, motivo='otro').status_code, 400)

    def test_no_se_reporta_a_si_mismo_ni_a_un_administrador(self):
        self.client.force_authenticate(self.propietario)
        self.assertEqual(self.reclamar().status_code, 400)
        self.assertEqual(self.reclamar(usuario_reportado=self.propietario.id, motivo='otro').status_code, 400)
        self.assertEqual(self.reclamar(usuario_reportado=self.administrador.id, motivo='otro').status_code, 400)

    def test_no_permite_dos_reclamos_abiertos_sobre_lo_mismo(self):
        primero = self.reclamar().data['id']
        self.assertEqual(self.reclamar().status_code, 400)

        self.cambiar_estado(primero, 'en_revision')
        self.client.force_authenticate(self.interesado)
        self.assertEqual(self.reclamar().status_code, 400)

        self.cambiar_estado(primero, 'resuelto')
        self.client.force_authenticate(self.interesado)
        self.assertEqual(self.reclamar().status_code, 201)

    def test_otro_usuario_puede_reclamar_lo_mismo(self):
        self.reclamar()
        self.client.force_authenticate(self.otro_interesado)

        self.assertEqual(self.reclamar().status_code, 201)

    def test_los_administradores_y_visitantes_no_reclaman(self):
        self.client.force_authenticate(self.administrador)
        self.assertEqual(self.reclamar().status_code, 403)

        self.client.force_authenticate(None)
        self.assertEqual(self.reclamar().status_code, 401)


class ConsultaDeReclamosTests(PruebaDeReclamos):
    def test_cada_usuario_ve_solo_sus_reclamos(self):
        propio = self.reclamar().data['id']
        self.client.force_authenticate(self.otro_interesado)
        self.reclamar()
        self.client.force_authenticate(self.interesado)

        respuesta = self.client.get(reverse('reclamo-mios'))

        self.assertEqual([r['id'] for r in respuesta.data], [propio])

    def test_el_administrador_ve_todos_y_filtra_por_estado(self):
        primero = self.reclamar().data['id']
        self.client.force_authenticate(self.otro_interesado)
        self.reclamar()
        self.cambiar_estado(primero, 'en_revision')

        todos = self.client.get(reverse('reclamo-lista')).data
        en_revision = self.client.get(reverse('reclamo-lista'), {'estado': 'en_revision'}).data

        self.assertEqual(len(todos), 2)
        self.assertEqual([r['id'] for r in en_revision], [primero])

    def test_solo_el_administrador_ve_el_listado_completo(self):
        self.assertEqual(self.client.get(reverse('reclamo-lista')).status_code, 403)

    def test_el_administrador_identifica_publicacion_y_motivo(self):
        self.reclamar(motivo='duplicada')
        self.client.force_authenticate(self.administrador)

        reclamo = self.client.get(reverse('reclamo-lista')).data[0]

        self.assertEqual(reclamo['publicacion']['id'], self.publicacion.id)
        self.assertEqual(reclamo['motivo'], 'duplicada')
        self.assertEqual(reclamo['reclamante']['id'], self.interesado.id)


class EstadosDeReclamoTests(PruebaDeReclamos):
    def setUp(self):
        super().setUp()
        self.reclamo_id = self.reclamar().data['id']

    def test_recorre_los_estados_del_rf_18(self):
        self.assertEqual(self.cambiar_estado(self.reclamo_id, 'en_revision').data['estado'], 'en_revision')

        respuesta = self.cambiar_estado(self.reclamo_id, 'resuelto', nota_administrador='Se dio de baja.')

        self.assertEqual(respuesta.data['estado'], 'resuelto')
        self.assertEqual(respuesta.data['nota_administrador'], 'Se dio de baja.')

    def test_se_puede_descartar_directamente(self):
        self.assertEqual(self.cambiar_estado(self.reclamo_id, 'descartado').status_code, 200)

    def test_rechaza_transiciones_invalidas(self):
        self.cambiar_estado(self.reclamo_id, 'resuelto')

        for destino in ('pendiente', 'en_revision', 'descartado', 'inventado'):
            with self.subTest(destino=destino):
                self.assertEqual(self.cambiar_estado(self.reclamo_id, destino).status_code, 400)

    def test_queda_registrado_en_la_auditoria(self):
        self.cambiar_estado(self.reclamo_id, 'en_revision')

        registro = RegistroAuditoria.objects.get()
        self.assertEqual(registro.tipo_accion, 'cambio_estado_reclamo')
        self.assertEqual(registro.actor, self.administrador)
        self.assertEqual(registro.detalle, 'pendiente -> en_revision')

    def test_avisa_al_reclamante_cuando_se_cierra(self):
        self.cambiar_estado(self.reclamo_id, 'en_revision')
        self.assertFalse(self.interesado.notificaciones.exists())

        self.cambiar_estado(self.reclamo_id, 'resuelto')

        notificacion = self.interesado.notificaciones.get()
        self.assertIn('fue resuelto', notificacion.mensaje)
        self.assertEqual(notificacion.tipo.codigo, 'exito')

    def test_solo_el_administrador_cambia_estados(self):
        self.client.force_authenticate(self.interesado)

        respuesta = self.client.post(reverse('reclamo-estado', args=[self.reclamo_id]), {'estado': 'resuelto'})

        self.assertEqual(respuesta.status_code, 403)
        self.assertEqual(Reclamo.objects.get().estado.codigo, 'pendiente')
