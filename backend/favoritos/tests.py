from django.db import IntegrityError, transaction
from django.urls import reverse
from rest_framework.test import APITestCase

from publicaciones.tests import crear_publicacion, crear_usuario

from .models import Favorito


class FavoritosTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.interesado = crear_usuario('interesado@mudateaca.com', rol='interesado')
        cls.otro_interesado = crear_usuario('otro.interesado@mudateaca.com', rol='interesado')
        cls.propietario = crear_usuario('propietario@mudateaca.com')
        cls.administrador = crear_usuario('admin@mudateaca.com', rol='administrador')
        cls.publicacion = crear_publicacion(cls.propietario)

    def setUp(self):
        self.client.force_authenticate(self.interesado)

    def agregar(self, publicacion=None):
        return self.client.post(
            reverse('favorito-lista'), {'publicacion': (publicacion or self.publicacion).id}, format='json',
        )

    def listar(self):
        return self.client.get(reverse('favorito-lista')).data['results']

    def test_agrega_y_lista_un_favorito(self):
        respuesta = self.agregar()

        self.assertEqual(respuesta.status_code, 201)
        favoritos = self.listar()
        self.assertEqual(favoritos[0]['publicacion']['id'], self.publicacion.id)
        self.assertTrue(favoritos[0]['disponible'])

    def test_no_registra_dos_veces_la_misma_publicacion(self):
        primera = self.agregar()

        segunda = self.agregar()

        self.assertEqual(segunda.status_code, 200)
        self.assertEqual(segunda.data['id'], primera.data['id'])
        self.assertEqual(Favorito.objects.count(), 1)

    def test_la_base_tambien_impide_duplicados(self):
        Favorito.objects.create(usuario=self.interesado, publicacion=self.publicacion)

        with self.assertRaises(IntegrityError), transaction.atomic():
            Favorito.objects.create(usuario=self.interesado, publicacion=self.publicacion)

    def test_cada_usuario_ve_solo_sus_favoritos(self):
        self.agregar()
        self.client.force_authenticate(self.otro_interesado)

        self.assertEqual(self.listar(), [])

    def test_quitar_un_favorito_es_logico(self):
        self.agregar()

        respuesta = self.client.delete(reverse('favorito-quitar', args=[self.publicacion.id]))

        self.assertEqual(respuesta.status_code, 204)
        self.assertEqual(self.listar(), [])
        self.assertIsNotNone(Favorito.todos.get().eliminado_en)
        segunda = self.client.delete(reverse('favorito-quitar', args=[self.publicacion.id]))
        self.assertEqual(segunda.status_code, 404)
        self.assertEqual(segunda.data['detail'], 'No se encontró el recurso solicitado.')

    def test_se_puede_volver_a_guardar_un_favorito_quitado(self):
        self.agregar()
        self.client.delete(reverse('favorito-quitar', args=[self.publicacion.id]))

        self.assertEqual(self.agregar().status_code, 201)
        self.assertEqual(Favorito.objects.count(), 1)
        self.assertEqual(Favorito.todos.count(), 2)

    def test_no_quita_favoritos_ajenos(self):
        Favorito.objects.create(usuario=self.otro_interesado, publicacion=self.publicacion)

        self.assertEqual(self.client.delete(reverse('favorito-quitar', args=[self.publicacion.id])).status_code, 404)
        self.assertTrue(Favorito.objects.exists())

    def test_solo_se_agregan_publicaciones_visibles(self):
        for estado, codigo in (('reservada', 201), ('alquilada', 201), ('pausada', 400), ('eliminada', 400)):
            with self.subTest(estado=estado):
                publicacion = crear_publicacion(self.propietario, estado=estado, ubicacion=estado)

                self.assertEqual(self.agregar(publicacion).status_code, codigo)

        self.assertEqual(
            self.client.post(reverse('favorito-lista'), {'publicacion': 999999}, format='json').status_code, 404,
        )

    def test_una_publicacion_que_dejo_de_ser_publica_no_expone_sus_datos(self):
        publicacion = crear_publicacion(self.propietario, ubicacion='Norte')
        self.agregar(publicacion)
        publicacion.estado_id = crear_publicacion(self.propietario, estado='archivada', ubicacion='X').estado_id
        publicacion.save(update_fields=['estado'])

        favorito = self.listar()[0]

        self.assertFalse(favorito['disponible'])
        self.assertEqual(favorito['publicacion'], {'id': publicacion.id, 'estado': 'archivada'})

    def test_solo_los_interesados_usan_favoritos(self):
        for usuario, codigo in ((self.propietario, 403), (self.administrador, 403), (None, 401)):
            with self.subTest(usuario=usuario):
                self.client.force_authenticate(usuario)

                self.assertEqual(self.agregar().status_code, codigo)
                self.assertEqual(self.client.get(reverse('favorito-lista')).status_code, codigo)

    def test_no_expone_datos_privados_del_anunciante(self):
        self.agregar()

        contenido = self.client.get(reverse('favorito-lista')).content.decode()

        self.assertNotIn(self.propietario.correo, contenido)
        self.assertNotIn('archivo_verificacion', contenido)
