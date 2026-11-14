import re
from unittest import mock

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings
from django.urls import URLPattern, URLResolver, get_resolver, reverse
from rest_framework.test import APIClient, APITestCase

from publicaciones.tests import DESCRIPCION, PruebaDePublicaciones, crear_publicacion, crear_usuario, imagen_de_prueba

from .validadores import validar_tamano

# Las únicas combinaciones de ruta y método que no exigen sesión.
RUTAS_PUBLICAS = {
    ('api/auth/registro/', 'POST'),
    ('api/auth/login/', 'POST'),
    ('api/auth/refresh/', 'POST'),
    ('api/auth/recuperar/', 'POST'),
    ('api/auth/recuperar/confirmar/', 'POST'),
    ('api/publicaciones/', 'GET'),
    ('api/publicaciones/<int:id>/', 'GET'),
}

RUTAS_DE_ADMINISTRACION = [
    ('get', 'api/publicaciones/pendientes/'),
    ('get', 'api/publicaciones/administracion/'),
    ('post', 'api/publicaciones/1/aprobar/'),
    ('post', 'api/publicaciones/1/rechazar/'),
    ('post', 'api/publicaciones/1/solicitar-modificaciones/'),
    ('post', 'api/publicaciones/1/mantener-observada/'),
    ('post', 'api/publicaciones/1/ocultar/'),
    ('post', 'api/publicaciones/1/mostrar/'),
    ('get', 'api/usuarios/'),
    ('get', 'api/usuarios/1/'),
    ('post', 'api/usuarios/1/suspender/'),
    ('post', 'api/usuarios/1/reactivar/'),
    ('get', 'api/reclamos/'),
    ('post', 'api/reclamos/1/estado/'),
]


def rutas_de_la_api():
    def recorrer(patrones, prefijo=''):
        for patron in patrones:
            if isinstance(patron, URLResolver):
                yield from recorrer(patron.url_patterns, prefijo + str(patron.pattern))
            elif isinstance(patron, URLPattern):
                yield prefijo + str(patron.pattern)

    # La ruta comodín (^api/) solo responde 404: no tiene datos que proteger.
    return sorted({ruta for ruta in recorrer(get_resolver().url_patterns) if ruta.startswith('api/')})


class RutasProtegidasTests(APITestCase):
    def test_ninguna_ruta_de_la_api_queda_abierta_sin_sesion(self):
        # Recorre todas las rutas: una ruta nueva sin permisos hace fallar esta prueba (RNF-05).
        rutas = rutas_de_la_api()
        self.assertGreater(len(rutas), 40)
        for ruta in rutas:
            url = '/' + re.sub(r'<[^>]+>', '1', ruta)
            for metodo in ('GET', 'POST', 'PATCH', 'DELETE'):
                if (ruta, metodo) in RUTAS_PUBLICAS:
                    continue
                with self.subTest(ruta=ruta, metodo=metodo):
                    cache.clear()
                    respuesta = APIClient().generic(metodo, url)

                    self.assertIn(respuesta.status_code, (401, 405))

    def test_las_rutas_de_administracion_rechazan_a_los_demas_roles(self):
        for rol in ('interesado', 'propietario', 'inmobiliaria'):
            cliente = APIClient()
            cliente.force_authenticate(crear_usuario(f'{rol}@mudateaca.com', rol=rol))
            for metodo, ruta in RUTAS_DE_ADMINISTRACION:
                with self.subTest(rol=rol, ruta=ruta):
                    self.assertEqual(getattr(cliente, metodo)(f'/{ruta}', {}, format='json').status_code, 403)




class InyeccionYCorsTests(APITestCase):
    def test_los_filtros_no_permiten_inyeccion_sql(self):
        crear_publicacion(crear_usuario('ana@mudateaca.com'))

        for valor in ("' OR '1'='1", "Centro'; DROP TABLE publicacion; --", '%'):
            with self.subTest(valor=valor):
                respuesta = self.client.get(reverse('publicacion-lista'), {'ubicacion': valor})

                self.assertEqual(respuesta.status_code, 200)
                self.assertEqual(respuesta.data['count'], 0)
        self.assertEqual(self.client.get(reverse('publicacion-lista')).data['count'], 1)

    @override_settings(CORS_ALLOWED_ORIGINS=['http://localhost:5173'])
    def test_solo_el_frontend_configurado_puede_llamar_a_la_api(self):
        permitido = self.client.get(reverse('publicacion-lista'), HTTP_ORIGIN='http://localhost:5173')
        ajeno = self.client.get(reverse('publicacion-lista'), HTTP_ORIGIN='http://sitio-malicioso.com')

        self.assertEqual(permitido['Access-Control-Allow-Origin'], 'http://localhost:5173')
        self.assertEqual(permitido['Access-Control-Allow-Credentials'], 'true')
        self.assertNotIn('Access-Control-Allow-Origin', ajeno)


class ErroresSinDetallesInternosTests(APITestCase):
    def test_un_error_inesperado_no_expone_detalles(self):
        cliente = APIClient(raise_request_exception=False)
        cliente.force_authenticate(crear_usuario('ana@mudateaca.com'))

        with mock.patch('notificaciones.views.NotificacionesNoLeidasView.get', side_effect=RuntimeError('detalle interno')):
            respuesta = cliente.get(reverse('notificacion-no-leidas'))

        self.assertEqual(respuesta.status_code, 500)
        self.assertEqual(respuesta.json(), {'detail': 'Ocurrió un error inesperado. Intentá de nuevo más tarde.'})
        self.assertNotIn('detalle interno', respuesta.content.decode())

    def test_una_pagina_inexistente_fuera_de_la_api_responde_en_json(self):
        respuesta = self.client.get('/no-existe/')

        self.assertEqual(respuesta.status_code, 404)
        self.assertEqual(respuesta.json(), {'detail': 'No se encontró el recurso solicitado.'})


class ArchivosSubidosTests(PruebaDePublicaciones):
    def publicar(self, archivo):
        self.client.force_authenticate(self.propietario)
        return self.client.post(reverse('publicacion-lista'), {
            'tipo_inmueble': 'departamento', 'modalidad': 'residencial', 'descripcion': DESCRIPCION,
            'precio': '250000.00', 'ubicacion': 'Centro', 'ambientes': 2, 'dormitorios': 1,
            'disponible_desde': '2026-11-01', 'tipo_documento_verificacion': 'factura_servicio',
            'archivo_verificacion': archivo, 'fotos': [imagen_de_prueba(f'foto{i}.jpg') for i in range(3)],
        }, format='multipart')

    def test_rechaza_un_archivo_disfrazado_con_otra_extension(self):
        for archivo in (
            SimpleUploadedFile('factura.pdf', b'MZ\x90\x00 programa ejecutable', content_type='application/pdf'),
            SimpleUploadedFile('impuesto.png', b'<script>alert(1)</script>', content_type='image/png'),
        ):
            with self.subTest(archivo=archivo.name):
                respuesta = self.publicar(archivo)

                self.assertEqual(respuesta.status_code, 400)
                self.assertEqual(
                    respuesta.data['archivo_verificacion'],
                    ['El contenido del archivo no corresponde a un PDF, JPG o PNG válido.'],
                )

    def test_rechaza_archivos_demasiado_grandes(self):
        grande = SimpleUploadedFile('factura.pdf', b'%PDF-' + b'0' * (10 * 1024 * 1024), content_type='application/pdf')

        respuesta = self.publicar(grande)

        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.data['archivo_verificacion'], ['El archivo no puede superar los 10 MB.'])

    def test_acepta_documentos_reales(self):
        for archivo in (
            SimpleUploadedFile('factura.pdf', b'%PDF-1.4 factura', content_type='application/pdf'),
            imagen_de_prueba('impuesto.png'),
        ):
            with self.subTest(archivo=archivo.name):
                self.assertEqual(self.publicar(archivo).status_code, 201)

    def test_las_fotos_tienen_que_ser_imagenes(self):
        self.client.force_authenticate(self.propietario)
        publicacion = crear_publicacion(self.propietario)
        texto = SimpleUploadedFile('foto.jpg', b'no soy una imagen', content_type='image/jpeg')

        respuesta = self.editar(publicacion, {'fotos': [texto]})

        self.assertEqual(respuesta.status_code, 400)


class LimiteDeTamanoTests(SimpleTestCase):
    def test_el_limite_es_de_diez_megas(self):
        validar_tamano(SimpleUploadedFile('a.jpg', b'0' * (10 * 1024 * 1024)))
        with self.assertRaisesMessage(ValidationError, 'no puede superar los 10 MB'):
            validar_tamano(SimpleUploadedFile('a.jpg', b'0' * (10 * 1024 * 1024 + 1)))
