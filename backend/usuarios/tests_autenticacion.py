# Pruebas de autenticación (tarea N°6): validadores, login, registro, recuperación de cuenta, sesión
# y almacenamiento de contraseñas. Cubren los casos de prueba CP-01, CP-02, CP-03 y CP-20 del SRS.
import os
import re
from datetime import datetime, timedelta
from unittest import mock

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core import mail
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.test import SimpleTestCase, override_settings
from django.urls import reverse
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from .models import EstadoCuenta, Suspension, Usuario
from .tests import PruebaSinLimites, crear_usuario
from .validators import validador_celular, validador_contrasena

CONTRASENA = 'Prueba123'
CORREO = 'usuario@mudateaca.com'
MENSAJE_CONTRASENA = 'La contraseña debe tener al menos 8 caracteres, con una mayúscula, una minúscula y un número.'
MENSAJE_LOGIN_INVALIDO = 'Usuario o contraseña incorrectos.'
MENSAJE_ENLACE_INVALIDO = 'El enlace de recuperación no es válido o venció.'


# Pruebas unitarias: validan reglas sueltas, sin base de datos ni API.

class ValidadoresTests(SimpleTestCase):
    def test_acepta_una_contrasena_valida(self):
        validador_contrasena('Prueba123')

    def test_rechaza_contrasenas_que_no_cumplen_las_reglas(self):
        for contrasena, motivo in (
            ('Corta1A', 'menos de 8 caracteres'),
            ('sinmayuscula1', 'sin mayúscula'),
            ('SINMINUSCULA1', 'sin minúscula'),
            ('SinNumeros', 'sin número'),
            ('', 'vacía'),
        ):
            with self.subTest(motivo=motivo), self.assertRaisesMessage(ValidationError, MENSAJE_CONTRASENA):
                validador_contrasena(contrasena)

    def test_django_rechaza_contrasenas_comunes_o_solo_numericas(self):
        for contrasena in ('Password1', '12345678'):
            with self.subTest(contrasena=contrasena), self.assertRaises(ValidationError):
                validate_password(contrasena)

    def test_acepta_celulares_validos(self):
        for celular in ('3411234567', '+54 9 341 123-4567', '2392-400000'):
            with self.subTest(celular=celular):
                validador_celular(celular)

    def test_rechaza_celulares_invalidos(self):
        for celular in ('abc1234567', '1234', '3' * 21, '341.123.4567'):
            with self.subTest(celular=celular), self.assertRaises(ValidationError):
                validador_celular(celular)


class LoginTests(PruebaSinLimites):
    @classmethod
    def setUpTestData(cls):
        cls.usuario = crear_usuario(CORREO)

    def iniciar_sesion(self, correo=CORREO, contrasena=CONTRASENA):
        return self.client.post(reverse('login'), {'correo': correo, 'contrasena': contrasena}, format='json')

    def test_login_correcto_devuelve_el_usuario_y_abre_la_sesion(self):
        respuesta = self.iniciar_sesion()

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['correo'], CORREO)
        self.assertEqual(respuesta.data['rol'], 'propietario')
        self.assertNotIn('password', respuesta.data)
        self.assertEqual(self.client.get(reverse('perfil')).status_code, 200)

    def test_los_tokens_viajan_en_cookies_httponly_y_nunca_en_el_cuerpo(self):
        respuesta = self.iniciar_sesion()

        for nombre in (settings.JWT_ACCESS_COOKIE, settings.JWT_REFRESH_COOKIE):
            with self.subTest(cookie=nombre):
                cookie = respuesta.cookies[nombre]
                self.assertTrue(cookie['httponly'])
                self.assertEqual(cookie['samesite'], 'Lax')
                self.assertNotIn(cookie.value, respuesta.content.decode())

    @override_settings(JWT_COOKIE_SECURE=True)
    def test_en_produccion_las_cookies_solo_viajan_por_https(self):
        respuesta = self.iniciar_sesion()

        self.assertTrue(respuesta.cookies[settings.JWT_ACCESS_COOKIE]['secure'])
        self.assertTrue(respuesta.cookies[settings.JWT_REFRESH_COOKIE]['secure'])

    def test_login_con_contrasena_incorrecta(self):
        respuesta = self.iniciar_sesion(contrasena='Incorrecta1')

        self.assertEqual(respuesta.status_code, 401)
        self.assertEqual(respuesta.data['detail'], MENSAJE_LOGIN_INVALIDO)
        self.assertNotIn(settings.JWT_ACCESS_COOKIE, respuesta.cookies)

    def test_un_error_de_login_no_revela_si_el_correo_existe(self):
        existente = self.iniciar_sesion(contrasena='Incorrecta1')
        inexistente = self.iniciar_sesion(correo='nadie@mudateaca.com', contrasena='Incorrecta1')

        self.assertEqual(existente.status_code, inexistente.status_code)
        self.assertEqual(existente.data, inexistente.data)

    def test_login_con_el_correo_en_mayusculas(self):
        # Antes fallaba: el registro guarda el correo en minúsculas y el login lo buscaba tal cual.
        respuesta = self.iniciar_sesion(correo='Usuario@MudateAca.COM')

        self.assertEqual(respuesta.status_code, 200)

    def test_login_con_campos_vacios_o_faltantes(self):
        for datos in ({}, {'correo': '', 'contrasena': ''}, {'correo': CORREO}):
            with self.subTest(datos=datos):
                respuesta = self.client.post(reverse('login'), datos, format='json')

                self.assertEqual(respuesta.status_code, 400)
                self.assertIn('contrasena', respuesta.data)

    def test_login_de_una_cuenta_suspendida_informa_el_motivo(self):
        self.usuario.estado_cuenta = EstadoCuenta.por_codigo('suspendido')
        self.usuario.save(update_fields=['estado_cuenta'])
        Suspension.objects.create(usuario=self.usuario, motivo='Reportes reiterados.')

        respuesta = self.iniciar_sesion()

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('Tu cuenta está suspendida. Motivo: Reportes reiterados.', str(respuesta.data))
        self.assertNotIn(settings.JWT_ACCESS_COOKIE, respuesta.cookies)

    def test_frena_los_intentos_repetidos_de_login(self):
        for _ in range(10):
            self.assertEqual(self.iniciar_sesion(contrasena='Incorrecta1').status_code, 401)

        respuesta = self.iniciar_sesion()

        # Ni siquiera la contraseña correcta entra hasta que pasa el minuto.
        self.assertEqual(respuesta.status_code, 429)
        self.assertTrue(respuesta.data['detail'].startswith('Hiciste demasiados intentos.'))
        self.assertIn('Retry-After', respuesta)


class RegistroTests(PruebaSinLimites):
    def datos(self, **cambios):
        return {
            'nombre': 'Ana', 'apellido': 'Pérez', 'celular': '3411234567', 'correo': 'ana@mudateaca.com',
            'contrasena': CONTRASENA, 'rol': 'propietario', **cambios,
        }

    def registrar(self, **cambios):
        return self.client.post(reverse('registro'), self.datos(**cambios), format='json')

    def test_registra_y_devuelve_el_codigo_del_rol(self):
        respuesta = self.registrar()

        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.data['rol'], 'propietario')
        self.assertEqual(respuesta.data['estado_cuenta'], 'activo')
        self.assertIsNone(respuesta.data['motivo_suspension'])
        self.assertNotIn('contrasena', respuesta.data)

    def test_guarda_el_correo_en_minusculas(self):
        self.registrar(correo='Ana@MudateAca.com')

        self.assertEqual(Usuario.objects.get().correo, 'ana@mudateaca.com')

    def test_no_permite_un_correo_ya_registrado(self):
        self.registrar()

        for correo in ('ana@mudateaca.com', 'ANA@mudateaca.com'):
            with self.subTest(correo=correo):
                respuesta = self.registrar(correo=correo)

                self.assertEqual(respuesta.status_code, 400)
                self.assertEqual(respuesta.data['correo'], ['Este correo ya está registrado.'])
        self.assertEqual(Usuario.objects.count(), 1)

    def test_rechaza_una_contrasena_corta(self):
        respuesta = self.registrar(contrasena='Corta1A')

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn(MENSAJE_CONTRASENA, respuesta.data['contrasena'])
        self.assertFalse(Usuario.objects.exists())

    def test_rechaza_contrasenas_debiles(self):
        for contrasena in ('sinnumeros', 'SINMINUSCULA1', 'sinmayuscula1', '12345678'):
            with self.subTest(contrasena=contrasena):
                self.assertEqual(self.registrar(contrasena=contrasena).status_code, 400)

    def test_exige_todos_los_campos_obligatorios(self):
        respuesta = self.client.post(reverse('registro'), {}, format='json')

        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(
            set(respuesta.data), {'nombre', 'apellido', 'celular', 'correo', 'contrasena', 'rol'},
        )

    def test_rechaza_un_correo_o_celular_invalidos(self):
        self.assertIn('correo', self.registrar(correo='no-es-un-correo').data)
        self.assertIn('celular', self.registrar(celular='abc').data)

    def test_no_permite_registrarse_como_administrador(self):
        respuesta = self.registrar(rol='administrador')

        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.data['rol'], ['El rol elegido no es válido para el registro.'])
        self.assertFalse(Usuario.objects.exists())

    def test_la_contrasena_se_guarda_con_hash(self):
        self.registrar()

        usuario = Usuario.objects.get()
        self.assertNotEqual(usuario.password, CONTRASENA)
        self.assertTrue(usuario.check_password(CONTRASENA))

    def test_frena_los_registros_repetidos(self):
        for numero in range(10):
            self.registrar(correo=f'ana{numero}@mudateaca.com')

        self.assertEqual(self.registrar(correo='otra@mudateaca.com').status_code, 429)


class RecuperacionDeCuentaTests(PruebaSinLimites):
    @classmethod
    def setUpTestData(cls):
        cls.usuario = crear_usuario(CORREO)

    def solicitar(self, correo=CORREO):
        return self.client.post(reverse('recuperar'), {'correo': correo}, format='json')

    def enlace(self):
        uid, token = re.search(r'uid=([^&\s]+)&token=(\S+)', mail.outbox[-1].body).groups()
        return uid, token

    def confirmar(self, uid, token, contrasena='NuevaClave1'):
        return self.client.post(
            reverse('recuperar-confirmar'), {'uid': uid, 'token': token, 'nueva_contrasena': contrasena},
            format='json',
        )

    def iniciar_sesion(self, contrasena):
        return self.client.post(reverse('login'), {'correo': CORREO, 'contrasena': contrasena}, format='json')

    def test_envia_un_enlace_al_frontend(self):
        respuesta = self.solicitar()

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [CORREO])
        self.assertIn(f'{settings.FRONTEND_URL}/restablecer-contrasena?uid=', mail.outbox[0].body)

    def test_un_correo_inexistente_recibe_la_misma_respuesta_y_ningun_correo(self):
        existente = self.solicitar().data
        inexistente = self.solicitar('nadie@mudateaca.com').data

        self.assertEqual(existente, inexistente)
        self.assertEqual(len(mail.outbox), 1)

    def test_encuentra_la_cuenta_aunque_el_correo_venga_en_mayusculas(self):
        self.solicitar('USUARIO@mudateaca.com')

        self.assertEqual(len(mail.outbox), 1)

    def test_el_enlace_cambia_la_contrasena(self):
        self.solicitar()

        respuesta = self.confirmar(*self.enlace())

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(self.iniciar_sesion('NuevaClave1').status_code, 200)
        self.assertEqual(self.iniciar_sesion(CONTRASENA).status_code, 401)

    def test_el_enlace_se_usa_una_sola_vez(self):
        self.solicitar()
        uid, token = self.enlace()
        self.confirmar(uid, token)

        respuesta = self.confirmar(uid, token, 'OtraClave1')

        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.data['detail'], MENSAJE_ENLACE_INVALIDO)
        self.usuario.refresh_from_db()
        self.assertTrue(self.usuario.check_password('NuevaClave1'))

    def test_el_enlace_vence_a_la_hora(self):
        self.solicitar()
        uid, token = self.enlace()

        dentro_de_dos_horas = datetime.now() + timedelta(hours=2)
        with mock.patch('django.contrib.auth.tokens.PasswordResetTokenGenerator._now', return_value=dentro_de_dos_horas):
            respuesta = self.confirmar(uid, token)

        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.data['detail'], MENSAJE_ENLACE_INVALIDO)

    def test_rechaza_enlaces_adulterados(self):
        self.solicitar()
        uid, token = self.enlace()

        for nombre, datos in (('token cambiado', (uid, token[:-2] + 'zz')), ('uid inexistente', ('abc', token))):
            with self.subTest(nombre):
                respuesta = self.confirmar(*datos)

                self.assertEqual(respuesta.status_code, 400)
                self.assertEqual(respuesta.data['detail'], MENSAJE_ENLACE_INVALIDO)

    def test_rechaza_una_contrasena_nueva_corta(self):
        self.solicitar()

        respuesta = self.confirmar(*self.enlace(), contrasena='Corta1A')

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn(MENSAJE_CONTRASENA, respuesta.data['nueva_contrasena'])
        self.usuario.refresh_from_db()
        self.assertTrue(self.usuario.check_password(CONTRASENA))


class SesionTests(PruebaSinLimites):
    @classmethod
    def setUpTestData(cls):
        cls.usuario = crear_usuario(CORREO)

    def iniciar_sesion(self):
        respuesta = self.client.post(reverse('login'), {'correo': CORREO, 'contrasena': CONTRASENA}, format='json')
        self.assertEqual(respuesta.status_code, 200)
        return respuesta

    def suspender(self):
        self.usuario.estado_cuenta = EstadoCuenta.por_codigo('suspendido')
        self.usuario.save(update_fields=['estado_cuenta'])
        Suspension.objects.create(usuario=self.usuario, motivo='Reportes reiterados.')

    def test_el_perfil_exige_sesion(self):
        self.assertEqual(self.client.get(reverse('perfil')).status_code, 401)

        self.iniciar_sesion()
        respuesta = self.client.get(reverse('perfil'))

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['correo'], CORREO)
        self.assertNotIn('password', respuesta.data)

    def test_cerrar_sesion_borra_las_cookies_e_invalida_la_renovacion(self):
        login = self.iniciar_sesion()
        refresh_anterior = login.cookies[settings.JWT_REFRESH_COOKIE].value

        respuesta = self.client.post(reverse('logout'))

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.cookies[settings.JWT_ACCESS_COOKIE].value, '')
        self.client.cookies[settings.JWT_REFRESH_COOKIE] = refresh_anterior
        self.assertEqual(self.client.post(reverse('refresh')).status_code, 401)

    def test_cerrar_sesion_sin_haber_iniciado(self):
        self.assertEqual(self.client.post(reverse('logout')).status_code, 401)

    def test_renueva_la_sesion_y_descarta_el_token_anterior(self):
        login = self.iniciar_sesion()
        refresh_anterior = login.cookies[settings.JWT_REFRESH_COOKIE].value

        respuesta = self.client.post(reverse('refresh'))

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['detail'], 'Token renovado.')
        self.assertNotEqual(respuesta.cookies[settings.JWT_REFRESH_COOKIE].value, refresh_anterior)
        self.client.cookies[settings.JWT_REFRESH_COOKIE] = refresh_anterior
        self.assertEqual(self.client.post(reverse('refresh')).status_code, 401)

    def test_renovar_sin_sesion_o_con_un_token_invalido(self):
        sin_sesion = self.client.post(reverse('refresh'))
        self.client.cookies[settings.JWT_REFRESH_COOKIE] = 'token-inventado'
        invalido = self.client.post(reverse('refresh'))

        self.assertEqual((sin_sesion.status_code, sin_sesion.data['detail']), (401, 'No hay sesión activa.'))
        self.assertEqual((invalido.status_code, invalido.data['detail']), (401, 'Sesión inválida o vencida.'))

    def test_un_token_adulterado_no_da_acceso(self):
        self.client.cookies[settings.JWT_ACCESS_COOKIE] = str(AccessToken.for_user(self.usuario))[:-3] + 'abc'

        self.assertEqual(self.client.get(reverse('perfil')).status_code, 401)

    def test_la_suspension_corta_una_sesion_ya_abierta(self):
        self.client.cookies[settings.JWT_ACCESS_COOKIE] = str(AccessToken.for_user(self.usuario))
        self.assertEqual(self.client.get(reverse('perfil')).status_code, 200)

        self.suspender()

        self.assertEqual(self.client.get(reverse('perfil')).status_code, 401)

    def test_una_cuenta_suspendida_no_renueva_su_sesion(self):
        self.client.cookies[settings.JWT_REFRESH_COOKIE] = str(RefreshToken.for_user(self.usuario))
        self.suspender()

        respuesta = self.client.post(reverse('refresh'))

        self.assertEqual(respuesta.status_code, 401)
        self.assertEqual(respuesta.data['detail'], 'Tu cuenta está suspendida.')
        self.assertEqual(respuesta.cookies[settings.JWT_ACCESS_COOKIE].value, '')

    def test_el_motivo_ignora_las_suspensiones_ya_levantadas(self):
        self.suspender()
        self.usuario.suspensiones.update(levantada_en='2026-10-01T10:00:00Z')

        self.assertIsNone(self.usuario.motivo_suspension)


class ContrasenasGuardadasTests(PruebaSinLimites):
    def iniciar_sesion(self, correo, contrasena):
        return self.client.post(reverse('login'), {'correo': correo, 'contrasena': contrasena}, format='json')

    @mock.patch.dict(os.environ, {'DJANGO_SUPERUSER_PASSWORD': CONTRASENA})
    def test_createsuperuser_guarda_la_contrasena_elegida(self):
        call_command(
            'createsuperuser', '--noinput', correo='admin@mudateaca.com',
            nombre='Admin', apellido='Mudate', celular='3411234567', verbosity=0,
        )

        administrador = Usuario.objects.get(correo='admin@mudateaca.com')
        self.assertTrue(administrador.check_password(CONTRASENA))
        self.assertEqual(administrador.rol.codigo, 'administrador')
        self.assertTrue(administrador.is_superuser)
        self.assertEqual(self.iniciar_sesion('admin@mudateaca.com', CONTRASENA).status_code, 200)

    def test_create_superuser_acepta_la_contrasena_con_ambos_nombres(self):
        for correo, clave in (('uno@mudateaca.com', {'password': CONTRASENA}),
                              ('dos@mudateaca.com', {'contrasena': CONTRASENA})):
            with self.subTest(clave=list(clave)):
                Usuario.objects.create_superuser(correo, **clave)

                self.assertEqual(self.iniciar_sesion(correo, CONTRASENA).status_code, 200)

    def test_la_contrasena_nunca_se_guarda_en_texto_plano(self):
        administrador = Usuario.objects.create_superuser('admin@mudateaca.com', password=CONTRASENA)

        self.assertNotEqual(administrador.password, CONTRASENA)
        self.assertTrue(administrador.password.startswith('pbkdf2_sha256$'))

    def test_un_superusuario_con_mayusculas_en_el_correo_puede_entrar(self):
        Usuario.objects.create_superuser('Admin@MudateAca.com', password=CONTRASENA)

        self.assertEqual(Usuario.objects.get().correo, 'admin@mudateaca.com')
        self.assertEqual(self.iniciar_sesion('Admin@MudateAca.com', CONTRASENA).status_code, 200)
