from django.db import IntegrityError, transaction
from django.urls import reverse
from rest_framework.test import APITestCase

from publicaciones.models import EstadoPublicacion
from publicaciones.tests import crear_publicacion, crear_usuario

from .models import Conversacion, Mensaje


class PruebaDeChat(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.interesado = crear_usuario('interesado@mudateaca.com', rol='interesado')
        cls.otro_interesado = crear_usuario('otro.interesado@mudateaca.com', rol='interesado')
        cls.propietario = crear_usuario('propietario@mudateaca.com')
        cls.administrador = crear_usuario('admin@mudateaca.com', rol='administrador')
        cls.publicacion = crear_publicacion(cls.propietario)

    def setUp(self):
        self.client.force_authenticate(self.interesado)

    def iniciar(self, publicacion=None):
        return self.client.post(
            reverse('conversacion-lista'), {'publicacion': (publicacion or self.publicacion).id}, format='json',
        )

    def nueva_conversacion(self, interesado=None):
        return Conversacion.objects.create(publicacion=self.publicacion, interesado=interesado or self.interesado)

    def enviar(self, conversacion, texto='Hola'):
        return self.client.post(
            reverse('conversacion-mensajes', args=[conversacion.id]), {'texto': texto}, format='json',
        )

    def mensajes(self, conversacion):
        return self.client.get(reverse('conversacion-mensajes', args=[conversacion.id]))


class IniciarConversacionTests(PruebaDeChat):
    def test_el_interesado_inicia_una_conversacion(self):
        respuesta = self.iniciar()

        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.data['publicacion']['id'], self.publicacion.id)
        self.assertEqual(respuesta.data['interesado']['id'], self.interesado.id)
        self.assertEqual(respuesta.data['anunciante']['id'], self.propietario.id)

    def test_retoma_la_conversacion_existente(self):
        primera = self.iniciar()

        segunda = self.iniciar()

        self.assertEqual(segunda.status_code, 200)
        self.assertEqual(segunda.data['id'], primera.data['id'])
        self.assertEqual(Conversacion.objects.count(), 1)

    def test_cada_interesado_tiene_su_conversacion(self):
        self.iniciar()
        self.client.force_authenticate(self.otro_interesado)

        self.assertEqual(self.iniciar().status_code, 201)

    def test_la_base_impide_duplicar_conversaciones(self):
        self.nueva_conversacion()

        with self.assertRaises(IntegrityError), transaction.atomic():
            self.nueva_conversacion()

    def test_solo_los_interesados_inician_conversaciones(self):
        for usuario, codigo in ((self.propietario, 403), (self.administrador, 403), (None, 401)):
            with self.subTest(usuario=usuario):
                self.client.force_authenticate(usuario)

                self.assertEqual(self.iniciar().status_code, codigo)

    def test_se_puede_consultar_por_activas_y_reservadas(self):
        for estado in ('activa', 'reservada'):
            with self.subTest(estado=estado):
                publicacion = crear_publicacion(self.propietario, estado=estado, ubicacion=estado)

                self.assertEqual(self.iniciar(publicacion).status_code, 201)

    def test_no_se_puede_iniciar_en_otros_estados(self):
        for estado in ('alquilada', 'pausada', 'pendiente_moderacion', 'archivada', 'eliminada'):
            with self.subTest(estado=estado):
                publicacion = crear_publicacion(self.propietario, estado=estado, ubicacion=estado)

                self.assertEqual(self.iniciar(publicacion).status_code, 400)
                self.assertFalse(Conversacion.objects.filter(publicacion=publicacion).exists())

    def test_rechaza_publicaciones_inexistentes_o_invalidas(self):
        url = reverse('conversacion-lista')

        self.assertEqual(self.client.post(url, {'publicacion': 999999}, format='json').status_code, 404)
        self.assertEqual(self.client.post(url, {'publicacion': 'abc'}, format='json').status_code, 400)
        self.assertEqual(self.client.post(url, {}, format='json').status_code, 400)

    def test_retoma_una_conversacion_aunque_la_publicacion_cambie_de_estado(self):
        self.iniciar()
        self.publicacion.estado = EstadoPublicacion.por_codigo('pausada')
        self.publicacion.save(update_fields=['estado'])

        self.assertEqual(self.iniciar().status_code, 200)

    def test_no_expone_el_contacto_de_los_participantes(self):
        contenido = self.iniciar().content.decode()

        self.assertNotIn(self.propietario.correo, contenido)
        self.assertNotIn(self.interesado.correo, contenido)
        self.assertNotIn(self.propietario.celular, contenido)


class ConsultaDeConversacionesTests(PruebaDeChat):
    def test_ambos_participantes_ven_la_conversacion(self):
        conversacion = self.nueva_conversacion()

        for usuario in (self.interesado, self.propietario):
            with self.subTest(usuario=usuario.correo):
                self.client.force_authenticate(usuario)

                respuesta = self.client.get(reverse('conversacion-lista'))

                self.assertEqual([c['id'] for c in respuesta.data], [conversacion.id])

    def test_nadie_mas_accede_a_la_conversacion(self):
        conversacion = self.nueva_conversacion()
        ajeno = crear_usuario('ajeno@mudateaca.com')

        for usuario in (self.otro_interesado, ajeno, self.administrador):
            with self.subTest(usuario=usuario.correo):
                self.client.force_authenticate(usuario)

                self.assertEqual(self.client.get(reverse('conversacion-lista')).data, [])
                self.assertEqual(
                    self.client.get(reverse('conversacion-detalle', args=[conversacion.id])).status_code, 404,
                )
                self.assertEqual(self.mensajes(conversacion).status_code, 404)
                self.assertEqual(self.enviar(conversacion).status_code, 404)

        self.assertFalse(Mensaje.objects.exists())

    def test_un_visitante_no_accede_al_chat(self):
        self.client.force_authenticate(None)

        self.assertEqual(self.client.get(reverse('conversacion-lista')).status_code, 401)


class MensajesTests(PruebaDeChat):
    def setUp(self):
        super().setUp()
        self.conversacion = self.nueva_conversacion()

    def test_ambos_participantes_escriben_y_leen(self):
        self.enviar(self.conversacion, '¿Sigue disponible?')
        self.client.force_authenticate(self.propietario)
        self.enviar(self.conversacion, 'Sí, sigue disponible.')

        respuesta = self.mensajes(self.conversacion)

        self.assertEqual(
            [(m['autor'], m['texto']) for m in respuesta.data],
            [(self.interesado.id, '¿Sigue disponible?'), (self.propietario.id, 'Sí, sigue disponible.')],
        )

    def test_el_autor_siempre_es_quien_tiene_la_sesion(self):
        respuesta = self.client.post(
            reverse('conversacion-mensajes', args=[self.conversacion.id]),
            {'texto': 'Hola', 'autor': self.propietario.id, 'leido': True},
            format='json',
        )

        self.assertEqual(respuesta.data['autor'], self.interesado.id)
        self.assertFalse(respuesta.data['leido'])

    def test_rechaza_mensajes_vacios_o_demasiado_largos(self):
        self.assertEqual(self.enviar(self.conversacion, '   ').status_code, 400)
        self.assertEqual(self.enviar(self.conversacion, 'a' * 2001).status_code, 400)
        self.assertEqual(self.enviar(self.conversacion, 'a' * 2000).status_code, 201)

    def test_los_mensajes_no_pasan_por_la_moderacion(self):
        self.assertEqual(self.enviar(self.conversacion, 'Mi teléfono es 3411234567').status_code, 201)

    def test_un_mensaje_nuevo_sube_la_conversacion(self):
        anterior = Conversacion.objects.create(
            publicacion=crear_publicacion(self.propietario, ubicacion='Otra'), interesado=self.interesado,
        )
        self.enviar(self.conversacion)

        respuesta = self.client.get(reverse('conversacion-lista'))

        self.assertEqual([c['id'] for c in respuesta.data], [self.conversacion.id, anterior.id])

    def test_se_puede_seguir_escribiendo_si_la_publicacion_cambia_de_estado(self):
        self.publicacion.estado = EstadoPublicacion.por_codigo('alquilada')
        self.publicacion.save(update_fields=['estado'])

        self.assertEqual(self.enviar(self.conversacion).status_code, 201)

    def test_devuelve_404_si_la_conversacion_no_existe(self):
        respuesta = self.client.get(reverse('conversacion-mensajes', args=[999999]))

        self.assertEqual(respuesta.status_code, 404)
