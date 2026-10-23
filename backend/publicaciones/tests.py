import io
import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from PIL import Image
from rest_framework.test import APITestCase

from usuarios.models import Usuario

from .models import Publicacion

MEDIA_TEMPORAL = tempfile.mkdtemp()


def imagen_de_prueba(nombre='foto.jpg'):
    buffer = io.BytesIO()
    Image.new('RGB', (10, 10), color='white').save(buffer, format='JPEG')
    return SimpleUploadedFile(nombre, buffer.getvalue(), content_type='image/jpeg')


@override_settings(MEDIA_ROOT=MEDIA_TEMPORAL)
class CrearPublicacionTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA_TEMPORAL, ignore_errors=True)

    def setUp(self):
        propietario = Usuario.objects.create_user(
            correo='propietario@mudateaca.com',
            contrasena='Prueba123',
            nombre='Ana',
            apellido='Pérez',
            celular='3411234567',
            rol='propietario',
        )
        self.client.force_authenticate(propietario)

    def datos(self, cantidad_fotos=3, archivo_verificacion=None):
        return {
            'tipo_inmueble': 'departamento',
            'modalidad': 'residencial',
            'descripcion': 'Departamento luminoso cerca del centro.',
            'precio': '250000.00',
            'ubicacion': 'Centro',
            'ambientes': 2,
            'dormitorios': 1,
            'disponible_desde': '2026-11-01',
            'tipo_documento_verificacion': 'factura_servicio',
            'archivo_verificacion': archivo_verificacion
            or SimpleUploadedFile('factura.pdf', b'%PDF-1.4 prueba', content_type='application/pdf'),
            'fotos': [imagen_de_prueba(f'foto{i}.jpg') for i in range(cantidad_fotos)],
        }

    def crear(self, datos):
        return self.client.post(reverse('publicacion-crear'), datos, format='multipart')

    def test_crea_publicacion_con_tres_fotos(self):
        respuesta = self.crear(self.datos(cantidad_fotos=3))

        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(Publicacion.objects.get().fotos.count(), 3)

    def test_rechaza_publicacion_con_menos_de_tres_fotos(self):
        respuesta = self.crear(self.datos(cantidad_fotos=2))

        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.data['fotos'], ['Subí como mínimo 3 fotografías.'])
        self.assertFalse(Publicacion.objects.exists())

    def test_acepta_archivo_de_verificacion_en_imagen(self):
        respuesta = self.crear(self.datos(archivo_verificacion=imagen_de_prueba('impuesto.png')))

        self.assertEqual(respuesta.status_code, 201)

    def test_rechaza_archivo_de_verificacion_con_formato_no_admitido(self):
        archivo = SimpleUploadedFile('factura.docx', b'contenido', content_type='application/msword')

        respuesta = self.crear(self.datos(archivo_verificacion=archivo))

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('archivo_verificacion', respuesta.data)
        self.assertFalse(Publicacion.objects.exists())
