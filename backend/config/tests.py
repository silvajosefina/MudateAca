import io
from unittest import mock

import cloudinary
from django.test import SimpleTestCase
from rest_framework.test import APITestCase

from publicaciones.tests import crear_usuario

from .almacenamiento import AlmacenamientoCloudinary

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


class AlmacenamientoCloudinaryTests(SimpleTestCase):
    # Simula Cloudinary: las pruebas nunca llaman al servicio real.
    def setUp(self):
        configuracion = cloudinary.config()
        self.configuracion_anterior = (configuracion.cloud_name, configuracion.api_key, configuracion.api_secret)
        cloudinary.config(cloud_name='prueba', api_key='111', api_secret='secreto')

    def tearDown(self):
        nombre, clave, secreto = self.configuracion_anterior
        cloudinary.config(cloud_name=nombre, api_key=clave, api_secret=secreto)

    def test_las_fotos_se_suben_publicas_con_un_nombre_aleatorio(self):
        almacenamiento = AlmacenamientoCloudinary()
        respuesta = {'public_id': 'publicaciones/abc', 'format': 'jpg'}
        with mock.patch('cloudinary.uploader.upload', return_value=respuesta) as subir:
            nombre = almacenamiento.save('publicaciones/casa.jpg', io.BytesIO(b'imagen'))

        self.assertEqual(nombre, 'publicaciones/abc.jpg')
        opciones = subir.call_args.kwargs
        self.assertEqual((opciones['type'], opciones['resource_type']), ('upload', 'image'))
        self.assertNotIn('casa', opciones['public_id'])
        self.assertTrue(almacenamiento.url(nombre).startswith('https://res.cloudinary.com/prueba/image/upload/'))

    def test_los_documentos_son_privados_y_se_descargan_con_un_enlace_que_vence(self):
        almacenamiento = AlmacenamientoCloudinary(privado=True, tipo_recurso='raw')
        with mock.patch('cloudinary.uploader.upload', return_value={'public_id': 'verificaciones/abc.pdf'}) as subir:
            nombre = almacenamiento.save('verificaciones/factura.pdf', io.BytesIO(b'%PDF-1.4'))

        self.assertEqual(nombre, 'verificaciones/abc.pdf')
        opciones = subir.call_args.kwargs
        self.assertEqual((opciones['type'], opciones['resource_type']), ('authenticated', 'raw'))
        self.assertTrue(opciones['public_id'].endswith('.pdf'))
        url = almacenamiento.url(nombre)
        self.assertTrue(url.startswith('https://api.cloudinary.com/v1_1/prueba/raw/download?'))
        self.assertIn('expires_at=', url)
        self.assertIn('signature=', url)
        self.assertNotIn('secreto', url)

    def test_borrar_usa_el_mismo_tipo_de_entrega(self):
        with mock.patch('cloudinary.uploader.destroy') as destruir:
            AlmacenamientoCloudinary(privado=True, tipo_recurso='raw').delete('verificaciones/abc.pdf')

        destruir.assert_called_once_with(
            'verificaciones/abc.pdf', invalidate=True, resource_type='raw', type='authenticated',
        )

    def test_nunca_informa_que_un_archivo_existe(self):
        self.assertFalse(AlmacenamientoCloudinary().exists('publicaciones/abc.jpg'))
