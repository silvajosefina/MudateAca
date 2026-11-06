import os
from unittest import mock

from django.conf import settings
from django.core.management import call_command
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from .models import EstadoCuenta, Rol, Suspension, Usuario


def crear_usuario(correo='usuario@mudateaca.com', rol='propietario', **campos):
    return Usuario.objects.create_user(
        correo=correo,
        contrasena='Prueba123',
        nombre='Ana',
        apellido='Pérez',
        celular='3411234567',
        rol=rol,
        **campos,
    )


class CatalogosTests(APITestCase):
    def test_las_migraciones_cargan_los_catalogos(self):
        self.assertEqual(
            set(Rol.objects.values_list('codigo', flat=True)),
            {'interesado', 'propietario', 'inmobiliaria', 'administrador'},
        )
        self.assertEqual(set(EstadoCuenta.objects.values_list('codigo', flat=True)), {'activo', 'suspendido'})

    def test_un_usuario_nuevo_queda_activo(self):
        self.assertEqual(crear_usuario().estado_cuenta.codigo, 'activo')

    def test_el_administrador_siempre_es_staff(self):
        self.assertTrue(crear_usuario(rol='administrador').is_staff)


class SuperusuarioTests(APITestCase):
    def iniciar_sesion(self, correo, contrasena):
        return self.client.post(reverse('login'), {'correo': correo, 'contrasena': contrasena}, format='json')

    @mock.patch.dict(os.environ, {'DJANGO_SUPERUSER_PASSWORD': 'Prueba123'})
    def test_createsuperuser_guarda_la_contrasena_elegida(self):
        call_command(
            'createsuperuser', '--noinput', correo='admin@mudateaca.com',
            nombre='Admin', apellido='Mudate', celular='3411234567', verbosity=0,
        )

        administrador = Usuario.objects.get(correo='admin@mudateaca.com')
        self.assertTrue(administrador.check_password('Prueba123'))
        self.assertEqual(administrador.rol.codigo, 'administrador')
        self.assertTrue(administrador.is_superuser)
        self.assertEqual(self.iniciar_sesion('admin@mudateaca.com', 'Prueba123').status_code, 200)

    def test_create_superuser_acepta_la_contrasena_con_ambos_nombres(self):
        for correo, clave in (('uno@mudateaca.com', {'password': 'Prueba123'}),
                              ('dos@mudateaca.com', {'contrasena': 'Prueba123'})):
            with self.subTest(clave=list(clave)):
                Usuario.objects.create_superuser(correo, **clave)

                self.assertEqual(self.iniciar_sesion(correo, 'Prueba123').status_code, 200)

    def test_la_contrasena_nunca_se_guarda_en_texto_plano(self):
        administrador = Usuario.objects.create_superuser('admin@mudateaca.com', password='Prueba123')

        self.assertNotEqual(administrador.password, 'Prueba123')
        self.assertTrue(administrador.password.startswith('pbkdf2_sha256$'))


class RegistroTests(APITestCase):
    def datos(self, **cambios):
        return {
            'nombre': 'Ana',
            'apellido': 'Pérez',
            'celular': '3411234567',
            'correo': 'ana@mudateaca.com',
            'contrasena': 'Prueba123',
            'rol': 'propietario',
            **cambios,
        }

    def test_registra_y_devuelve_el_codigo_del_rol(self):
        respuesta = self.client.post(reverse('registro'), self.datos(), format='json')

        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.data['rol'], 'propietario')
        self.assertEqual(respuesta.data['estado_cuenta'], 'activo')
        self.assertIsNone(respuesta.data['motivo_suspension'])

    def test_no_permite_registrarse_como_administrador(self):
        respuesta = self.client.post(reverse('registro'), self.datos(rol='administrador'), format='json')

        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.data['rol'], ['El rol elegido no es válido para el registro.'])
        self.assertFalse(Usuario.objects.exists())


class SuspensionTests(APITestCase):
    def setUp(self):
        self.usuario = crear_usuario()

    def suspender(self):
        self.usuario.estado_cuenta = EstadoCuenta.por_codigo('suspendido')
        self.usuario.save(update_fields=['estado_cuenta'])
        Suspension.objects.create(usuario=self.usuario, motivo='Reportes reiterados.')

    def test_login_informa_el_motivo_de_la_suspension(self):
        self.suspender()

        respuesta = self.client.post(
            reverse('login'), {'correo': self.usuario.correo, 'contrasena': 'Prueba123'}, format='json',
        )

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('Reportes reiterados.', str(respuesta.data))

    def test_el_motivo_ignora_las_suspensiones_ya_levantadas(self):
        self.suspender()
        self.usuario.suspensiones.update(levantada_en='2026-10-01T10:00:00Z')

        self.assertIsNone(self.usuario.motivo_suspension)

    def test_la_suspension_corta_una_sesion_ya_abierta(self):
        self.client.cookies[settings.JWT_ACCESS_COOKIE] = str(AccessToken.for_user(self.usuario))
        self.assertEqual(self.client.get(reverse('perfil')).status_code, 200)

        self.suspender()

        self.assertEqual(self.client.get(reverse('perfil')).status_code, 401)
