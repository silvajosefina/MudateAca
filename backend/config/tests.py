from rest_framework.test import APITestCase

from publicaciones.tests import crear_usuario

NO_ENCONTRADO = 'No se encontró el recurso solicitado.'


class ErroresGeneralesDeLaApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.interesado = crear_usuario('interesado@mudateaca.com', rol='interesado')

    def setUp(self):
        self.client.force_authenticate(self.interesado)

    def test_una_ruta_inexistente_responde_json_en_espanol(self):
        for metodo, ruta in (
            ('get', '/api/no-existe/'),
            ('post', '/api/favoritos/abc/'),
            ('delete', '/api/notificaciones/abc/'),
            ('post', '/api/conversaciones/abc/mensajes/'),
        ):
            with self.subTest(metodo=metodo, ruta=ruta):
                respuesta = getattr(self.client, metodo)(ruta)

                self.assertEqual(respuesta.status_code, 404)
                self.assertEqual(respuesta['Content-Type'], 'application/json')
                self.assertEqual(respuesta.json(), {'detail': NO_ENCONTRADO})

    def test_una_ruta_sin_barra_final_indica_como_corregirla(self):
        # Antes un POST o PATCH sin la barra final daba error 500.
        for metodo in ('get', 'post', 'patch', 'delete'):
            with self.subTest(metodo=metodo):
                respuesta = getattr(self.client, metodo)('/api/favoritos', {'publicacion': 1}, format='json')

                self.assertEqual(respuesta.status_code, 404)
                self.assertEqual(respuesta.json(), {'detail': 'La ruta debe terminar con "/": /api/favoritos/'})

    def test_un_json_mal_formado_no_expone_el_error_tecnico(self):
        respuesta = self.client.post('/api/favoritos/', '{"publicacion": ', content_type='application/json')

        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.json(), {'detail': 'El cuerpo de la solicitud no tiene un formato válido.'})

    def test_un_codigo_de_catalogo_invalido_tiene_un_mensaje_claro(self):
        for ruta, campo, valor in (
            ('/api/publicaciones/', 'modalidad', 'inventada'),
            ('/api/publicaciones/', 'tipo_inmueble', 'castillo'),
        ):
            with self.subTest(campo=campo):
                respuesta = self.client.get(ruta, {campo: valor})

                self.assertEqual(respuesta.status_code, 400)
                self.assertEqual(respuesta.json(), {campo: ['Elegí una opción válida.']})

        respuesta = self.client.post('/api/busquedas/', {'tipo_inmueble': 'castillo'}, format='json')
        self.assertEqual(respuesta.json(), {'tipo_inmueble': ['Elegí una opción válida.']})

    def test_un_id_fuera_de_rango_no_rompe_la_api(self):
        enorme = 10**30
        for ruta in (f'/api/publicaciones/{enorme}/', f'/api/busquedas/{enorme}/', f'/api/conversaciones/{enorme}/'):
            with self.subTest(ruta=ruta):
                respuesta = self.client.get(ruta)

                self.assertEqual(respuesta.status_code, 404)
                self.assertEqual(respuesta.json(), {'detail': NO_ENCONTRADO})
