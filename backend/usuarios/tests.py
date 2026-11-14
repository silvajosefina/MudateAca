from django.core import mail
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APITestCase

from auditoria.models import RegistroAuditoria

from .models import EstadoCuenta, Rol, Suspension, Usuario


class PruebaSinLimites(APITestCase):
    # El registro y el login limitan los intentos por minuto; cada prueba empieza de cero.
    def setUp(self):
        cache.clear()


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








class InmobiliariaTests(PruebaSinLimites):
    def registrar(self, **cambios):
        datos = {
            'nombre': 'Ana', 'apellido': 'Pérez', 'celular': '3411234567', 'correo': 'centro@mudateaca.com',
            'contrasena': 'Prueba123', 'rol': 'inmobiliaria', 'razon_social': 'Inmobiliaria Centro SRL', **cambios,
        }
        return self.client.post(reverse('registro'), datos, format='json')

    def test_la_inmobiliaria_se_registra_con_razon_social(self):
        respuesta = self.registrar()

        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.data['razon_social'], 'Inmobiliaria Centro SRL')

    def test_la_razon_social_es_obligatoria_para_inmobiliarias(self):
        for valor in ('', '   ', None):
            with self.subTest(valor=valor):
                respuesta = self.registrar(razon_social=valor)

                self.assertEqual(respuesta.status_code, 400)
                self.assertEqual(respuesta.data['razon_social'], ['Indicá la razón social de la inmobiliaria.'])

    def test_los_demas_roles_no_guardan_razon_social(self):
        respuesta = self.registrar(rol='propietario', razon_social='Algo')

        self.assertEqual(respuesta.status_code, 201)
        self.assertIsNone(Usuario.objects.get().razon_social)

    def test_la_inmobiliaria_actualiza_su_perfil(self):
        inmobiliaria = crear_usuario('centro@mudateaca.com', rol='inmobiliaria', razon_social='Centro SRL')
        self.client.force_authenticate(inmobiliaria)

        respuesta = self.client.patch(reverse('perfil'), {'razon_social': 'Centro Propiedades SRL'}, format='json')
        sin_razon = self.client.patch(reverse('perfil'), {'razon_social': ''}, format='json')
        solo_nombre = self.client.patch(reverse('perfil'), {'nombre': 'Laura'}, format='json')

        self.assertEqual(respuesta.data['razon_social'], 'Centro Propiedades SRL')
        self.assertEqual(sin_razon.status_code, 400)
        self.assertEqual(solo_nombre.data['razon_social'], 'Centro Propiedades SRL')

    def test_el_perfil_no_permite_cambiar_rol_correo_ni_estado(self):
        usuario = crear_usuario('ana@mudateaca.com')
        self.client.force_authenticate(usuario)

        self.client.patch(
            reverse('perfil'),
            {'rol': 'administrador', 'correo': 'otro@mudateaca.com', 'estado_cuenta': 'suspendido', 'is_staff': True},
            format='json',
        )

        usuario.refresh_from_db()
        self.assertEqual((usuario.rol.codigo, usuario.correo, usuario.estado_cuenta.codigo), ('propietario', 'ana@mudateaca.com', 'activo'))
        self.assertFalse(usuario.is_staff)

    def test_el_perfil_valida_el_celular(self):
        self.client.force_authenticate(crear_usuario('ana@mudateaca.com'))

        self.assertEqual(self.client.patch(reverse('perfil'), {'celular': 'abc'}, format='json').status_code, 400)


class GestionDeUsuariosTests(PruebaSinLimites):
    @classmethod
    def setUpTestData(cls):
        cls.administrador = crear_usuario('admin@mudateaca.com', rol='administrador')
        cls.propietario = crear_usuario('propietario@mudateaca.com')
        cls.inmobiliaria = crear_usuario('centro@mudateaca.com', rol='inmobiliaria', razon_social='Centro SRL')

    def setUp(self):
        super().setUp()
        self.client.force_authenticate(self.administrador)

    def suspender(self, usuario, motivo='Publicaciones engañosas reiteradas.'):
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(reverse('usuario-suspender', args=[usuario.id]), {'motivo': motivo}, format='json')

    def reactivar(self, usuario):
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.post(reverse('usuario-reactivar', args=[usuario.id]))

    def test_lista_los_usuarios_sin_los_administradores(self):
        respuesta = self.client.get(reverse('usuario-administracion'))

        self.assertEqual({u['correo'] for u in respuesta.data['results']}, {self.propietario.correo, self.inmobiliaria.correo})
        self.assertEqual(respuesta.data['totales'], {'activo': 2})

    def test_filtra_inmobiliarias_y_busca_por_razon_social(self):
        por_rol = self.client.get(reverse('usuario-administracion'), {'rol': 'inmobiliaria'})
        por_texto = self.client.get(reverse('usuario-administracion'), {'busqueda': 'centro srl'})

        self.assertEqual([u['razon_social'] for u in por_rol.data['results']], ['Centro SRL'])
        self.assertEqual([u['id'] for u in por_texto.data['results']], [self.inmobiliaria.id])
        self.assertEqual(self.client.get(reverse('usuario-administracion'), {'rol': 'administrador'}).status_code, 400)

    def test_el_detalle_cuenta_publicaciones_y_reclamos(self):
        from publicaciones.tests import crear_publicacion

        crear_publicacion(self.inmobiliaria)
        crear_publicacion(self.inmobiliaria, estado='eliminada', ubicacion='Eliminada')

        datos = self.client.get(reverse('usuario-administracion-detalle', args=[self.inmobiliaria.id])).data

        self.assertEqual(datos['cantidad_publicaciones'], 1)
        self.assertEqual(datos['reclamos_recibidos'], 0)
        self.assertEqual(datos['suspensiones'], [])

    def test_suspender_bloquea_avisa_por_correo_y_audita(self):
        respuesta = self.suspender(self.propietario)

        self.assertEqual(respuesta.data['estado_cuenta'], 'suspendido')
        self.assertEqual(respuesta.data['motivo_suspension'], 'Publicaciones engañosas reiteradas.')
        self.assertEqual(Suspension.objects.get().administrador, self.administrador)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Publicaciones engañosas reiteradas.', mail.outbox[0].body)
        self.assertEqual(mail.outbox[0].to, [self.propietario.correo])
        self.assertIn('Tu cuenta fue suspendida', self.propietario.notificaciones.get().mensaje)
        self.assertEqual(RegistroAuditoria.objects.get().tipo_accion, 'suspension_usuario')
        self.client.force_authenticate(None)
        login = self.client.post(
            reverse('login'), {'correo': self.propietario.correo, 'contrasena': 'Prueba123'}, format='json',
        )
        self.assertEqual(login.status_code, 400)

    def test_reactivar_levanta_la_suspension_y_avisa(self):
        self.suspender(self.propietario)

        respuesta = self.reactivar(self.propietario)

        self.assertEqual(respuesta.data['estado_cuenta'], 'activo')
        self.assertIsNone(respuesta.data['motivo_suspension'])
        self.assertIsNotNone(Suspension.objects.get().levantada_en)
        self.assertEqual(len(mail.outbox), 2)
        self.assertIn('reactivada', mail.outbox[1].subject)

    def test_rechaza_suspensiones_y_reactivaciones_sin_sentido(self):
        self.assertEqual(self.reactivar(self.propietario).status_code, 400)
        self.suspender(self.propietario)
        self.assertEqual(self.suspender(self.propietario).status_code, 400)
        self.assertEqual(self.client.post(reverse('usuario-suspender', args=[self.inmobiliaria.id]), {}).status_code, 400)
        self.assertEqual(Suspension.objects.count(), 1)

    def test_no_se_gestionan_administradores(self):
        respuesta = self.suspender(self.administrador)

        self.assertEqual(respuesta.status_code, 404)
        self.assertFalse(Suspension.objects.exists())

    def test_solo_el_administrador_gestiona_usuarios(self):
        self.client.force_authenticate(self.propietario)

        self.assertEqual(self.client.get(reverse('usuario-administracion')).status_code, 403)
        self.assertEqual(self.suspender(self.inmobiliaria).status_code, 403)
        self.assertFalse(Suspension.objects.exists())
