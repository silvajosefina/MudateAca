import io
import os
import shutil
import tempfile
from datetime import timedelta
from io import StringIO
from unittest import mock

from django.contrib.gis.geos import Point
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import SimpleTestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from PIL import Image
from rest_framework.test import APITestCase

from auditoria.models import RegistroAuditoria
from config.almacenamiento import AlmacenamientoCloudinary
from favoritos.models import Favorito
from usuarios.models import Usuario

from .models import EstadoPublicacion, EventoModeracion, FotoPublicacion, Modalidad, Publicacion, TipoInmueble
from .moderacion import tiene_datos_de_contacto, tiene_palabras_prohibidas

MEDIA_TEMPORAL = tempfile.mkdtemp()
PRIVADO_TEMPORAL = tempfile.mkdtemp()

DESCRIPCION = 'Departamento luminoso cerca del centro.'


def imagen_de_prueba(nombre='foto.jpg'):
    buffer = io.BytesIO()
    Image.new('RGB', (10, 10), color='white').save(buffer, format='JPEG')
    return SimpleUploadedFile(nombre, buffer.getvalue(), content_type='image/jpeg')


def crear_usuario(correo, rol='propietario'):
    return Usuario.objects.create_user(
        correo=correo,
        contrasena='Prueba123',
        nombre='Ana',
        apellido='Pérez',
        celular='3411234567',
        rol=rol,
    )


def crear_publicacion(propietario, estado='activa', tipo_inmueble='departamento', modalidad='residencial', **campos):
    datos = {
        'descripcion': DESCRIPCION,
        'ubicacion': 'Centro',
        'precio': '250000.00',
        'ambientes': 2,
        'dormitorios': 1,
        'disponible_desde': '2026-11-01',
        'tipo_documento_verificacion': 'factura_servicio',
        'archivo_verificacion': 'verificaciones/factura.pdf',
        **campos,
    }
    publicacion = Publicacion.objects.create(
        propietario=propietario,
        estado=EstadoPublicacion.por_codigo(estado),
        tipo_inmueble=TipoInmueble.por_codigo(tipo_inmueble),
        modalidad=Modalidad.por_codigo(modalidad),
        **datos,
    )
    for orden in range(3):
        FotoPublicacion.objects.create(publicacion=publicacion, imagen=f'publicaciones/{orden}.jpg', orden=orden)
    return publicacion


@override_settings(MEDIA_ROOT=MEDIA_TEMPORAL, PRIVADO_ROOT=PRIVADO_TEMPORAL)
class PruebaDePublicaciones(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA_TEMPORAL, ignore_errors=True)
        shutil.rmtree(PRIVADO_TEMPORAL, ignore_errors=True)

    @classmethod
    def setUpTestData(cls):
        # Una sola vez por clase: cifrar contraseñas es lento a propósito.
        cls.propietario = crear_usuario('propietario@mudateaca.com')
        cls.otro = crear_usuario('otro@mudateaca.com')
        cls.inmobiliaria = crear_usuario('inmobiliaria@mudateaca.com', rol='inmobiliaria')
        cls.interesado = crear_usuario('interesado@mudateaca.com', rol='interesado')
        cls.administrador = crear_usuario('admin@mudateaca.com', rol='administrador')

    def detalle(self, publicacion):
        return reverse('publicacion-detalle', args=[publicacion.id])

    def editar(self, publicacion, datos, como=None):
        self.client.force_authenticate(como or publicacion.propietario)
        return self.client.patch(self.detalle(publicacion), datos, format='multipart')

    def codigo_de_estado(self, publicacion):
        return Publicacion.objects.get(id=publicacion.id).estado.codigo


class CrearPublicacionTests(PruebaDePublicaciones):
    def setUp(self):
        self.client.force_authenticate(self.propietario)

    def datos(self, cantidad_fotos=3, archivo_verificacion=None, **cambios):
        return {
            'tipo_inmueble': 'departamento',
            'modalidad': 'residencial',
            'descripcion': DESCRIPCION,
            'precio': '250000.00',
            'ubicacion': 'Centro',
            'ambientes': 2,
            'dormitorios': 1,
            'disponible_desde': '2026-11-01',
            'tipo_documento_verificacion': 'factura_servicio',
            'archivo_verificacion': archivo_verificacion
            or SimpleUploadedFile('factura.pdf', b'%PDF-1.4 prueba', content_type='application/pdf'),
            'fotos': [imagen_de_prueba(f'foto{i}.jpg') for i in range(cantidad_fotos)],
            **cambios,
        }

    def crear(self, datos):
        return self.client.post(reverse('publicacion-lista'), datos, format='multipart')

    def test_crea_publicacion_con_tres_fotos(self):
        respuesta = self.crear(self.datos(cantidad_fotos=3))

        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(Publicacion.objects.get().fotos.count(), 3)

    def test_una_publicacion_correcta_espera_la_revision_del_administrador(self):
        respuesta = self.crear(self.datos())

        self.assertEqual(respuesta.data['estado'], 'pendiente_moderacion')
        self.assertEqual(Publicacion.objects.get().propietario, self.propietario)

    def test_guarda_los_datos_opcionales(self):
        respuesta = self.crear(self.datos(
            expensas='15000.00', amueblado='true', acepta_mascotas='true', requisitos='Garantía propietaria',
            disponible_hasta='2026-12-01',
        ))

        self.assertEqual(respuesta.status_code, 201)
        publicacion = Publicacion.objects.get()
        self.assertTrue(publicacion.amueblado)
        self.assertTrue(publicacion.acepta_mascotas)
        self.assertFalse(publicacion.apto_estudiantes)
        self.assertEqual(respuesta.data['expensas'], '15000.00')

    def test_rechaza_publicacion_con_menos_de_tres_fotos(self):
        respuesta = self.crear(self.datos(cantidad_fotos=2))

        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.data['fotos'], ['Subí como mínimo 3 fotografías.'])
        self.assertFalse(Publicacion.objects.exists())

    def test_rechaza_publicacion_sin_fotos(self):
        datos = self.datos()
        del datos['fotos']

        respuesta = self.crear(datos)

        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.data['fotos'], ['Subí como mínimo 3 fotografías.'])

    def test_acepta_archivo_de_verificacion_en_imagen(self):
        respuesta = self.crear(self.datos(archivo_verificacion=imagen_de_prueba('impuesto.png')))

        self.assertEqual(respuesta.status_code, 201)

    def test_rechaza_archivo_de_verificacion_con_formato_no_admitido(self):
        archivo = SimpleUploadedFile('factura.docx', b'contenido', content_type='application/msword')

        respuesta = self.crear(self.datos(archivo_verificacion=archivo))

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('archivo_verificacion', respuesta.data)
        self.assertFalse(Publicacion.objects.exists())

    def test_rechaza_precio_invalido(self):
        for precio in ('0', '-100', 'abc'):
            with self.subTest(precio=precio):
                self.assertEqual(self.crear(self.datos(precio=precio)).status_code, 400)

    def test_rechaza_textos_demasiado_largos(self):
        respuesta = self.crear(self.datos(descripcion='a' * 5001))

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('descripcion', respuesta.data)

    def test_rechaza_expensas_negativas(self):
        self.assertEqual(self.crear(self.datos(expensas='-1')).status_code, 400)

    def test_rechaza_cero_ambientes_pero_acepta_monoambiente_sin_dormitorios(self):
        self.assertEqual(self.crear(self.datos(ambientes=0)).status_code, 400)
        self.assertEqual(self.crear(self.datos(ambientes=1, dormitorios=0)).status_code, 201)

    def test_rechaza_disponible_hasta_anterior_a_desde(self):
        respuesta = self.crear(self.datos(disponible_hasta='2026-10-01'))

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('disponible_hasta', respuesta.data)

    def test_temporario_exige_duracion_minima(self):
        respuesta = self.crear(self.datos(modalidad='temporario'))

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('duracion_minima_dias', respuesta.data)

    def test_temporario_guarda_la_duracion_y_residencial_la_ignora(self):
        self.crear(self.datos(modalidad='temporario', duracion_minima_dias=7))
        self.crear(self.datos(descripcion='Casa amplia con patio y parrilla.', duracion_minima_dias=7))

        self.assertEqual(Publicacion.objects.get(modalidad__codigo='temporario').duracion_minima_dias, 7)
        self.assertIsNone(Publicacion.objects.get(modalidad__codigo='residencial').duracion_minima_dias)

    def test_rechaza_documento_que_no_corresponde_al_rol(self):
        respuesta = self.crear(self.datos(tipo_documento_verificacion='matricula_corredor'))

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('tipo_documento_verificacion', respuesta.data)

    def test_la_inmobiliaria_usa_sus_propios_documentos(self):
        self.client.force_authenticate(self.inmobiliaria)

        respuesta = self.crear(self.datos(tipo_documento_verificacion='matricula_corredor'))

        self.assertEqual(respuesta.status_code, 201)

    def test_solo_propietarios_e_inmobiliarias_publican(self):
        self.client.force_authenticate(self.interesado)
        self.assertEqual(self.crear(self.datos()).status_code, 403)

        self.client.force_authenticate(None)
        self.assertEqual(self.crear(self.datos()).status_code, 401)

    def test_guarda_las_coordenadas_cuando_llegan(self):
        respuesta = self.crear(self.datos(lat='-35.9666', lng='-62.7333'))

        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.data['lat'], -35.9666)
        self.assertEqual(respuesta.data['lng'], -62.7333)
        coordenadas = Publicacion.objects.get().coordenadas
        self.assertEqual((coordenadas.x, coordenadas.y), (-62.7333, -35.9666))

    def test_las_coordenadas_son_opcionales(self):
        respuesta = self.crear(self.datos())

        self.assertEqual(respuesta.status_code, 201)
        self.assertIsNone(respuesta.data['lat'])
        self.assertIsNone(Publicacion.objects.get().coordenadas)

    def test_rechaza_una_sola_coordenada(self):
        respuesta = self.crear(self.datos(lat='-35.9666'))

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('lat', respuesta.data)

    def test_rechaza_coordenadas_fuera_de_rango(self):
        self.assertEqual(self.crear(self.datos(lat='-95', lng='-62')).status_code, 400)
        self.assertEqual(self.crear(self.datos(lat='-35', lng='200')).status_code, 400)


class ModeracionAutomaticaTests(PruebaDePublicaciones):
    def setUp(self):
        self.client.force_authenticate(self.propietario)

    def crear(self, **cambios):
        return self.client.post(reverse('publicacion-lista'), {
            'tipo_inmueble': 'departamento',
            'modalidad': 'residencial',
            'descripcion': DESCRIPCION,
            'precio': '250000.00',
            'ubicacion': 'Centro',
            'ambientes': 2,
            'dormitorios': 1,
            'disponible_desde': '2026-11-01',
            'tipo_documento_verificacion': 'factura_servicio',
            'archivo_verificacion': SimpleUploadedFile('f.pdf', b'%PDF-1.4', content_type='application/pdf'),
            'fotos': [imagen_de_prueba(f'foto{i}.jpg') for i in range(3)],
            **cambios,
        }, format='multipart')

    def test_datos_de_contacto_dejan_la_publicacion_observada(self):
        casos = (
            'Lindo departamento, llamame al 341-123-4567.',
            'Lindo departamento, escribime a dueno@correo.com.',
            'Mirá más fotos del departamento en www.misfotos.com.ar',
        )
        for descripcion in casos:
            with self.subTest(descripcion=descripcion):
                respuesta = self.crear(descripcion=descripcion)

                self.assertEqual(respuesta.status_code, 201)
                self.assertEqual(respuesta.data['estado'], 'observada')
                self.assertIn('chat interno', respuesta.data['nota_moderacion'])

    def test_revisa_tambien_los_requisitos(self):
        self.assertEqual(self.crear(requisitos='Consultas al 3411234567').data['estado'], 'observada')

    def test_descripcion_corta_queda_observada(self):
        respuesta = self.crear(descripcion='Casa linda')

        self.assertEqual(respuesta.data['estado'], 'observada')
        self.assertIn('al menos 20 caracteres', respuesta.data['nota_moderacion'])

    def test_palabra_prohibida_queda_observada(self):
        self.assertEqual(self.crear(descripcion='Departamento para PROSTITUCIÓN y otras cosas.').data['estado'], 'observada')

    def test_registra_un_evento_sin_administrador(self):
        respuesta = self.crear(descripcion='Casa linda')

        evento = EventoModeracion.objects.get(publicacion_id=respuesta.data['id'])
        self.assertEqual(evento.tipo, 'moderacion_automatica')
        self.assertIsNone(evento.administrador)

    def test_detecta_duplicados_de_cualquier_anunciante(self):
        crear_publicacion(self.otro, descripcion=DESCRIPCION.upper(), ubicacion='CENTRO')

        respuesta = self.crear()

        self.assertEqual(respuesta.data['estado'], 'observada')
        self.assertIn('misma descripción', respuesta.data['nota_moderacion'])

    def test_no_compara_contra_archivadas_ni_eliminadas(self):
        crear_publicacion(self.propietario, estado='archivada')
        crear_publicacion(self.propietario, estado='eliminada')

        self.assertEqual(self.crear().data['estado'], 'pendiente_moderacion')

    def test_la_misma_descripcion_en_otra_ubicacion_no_es_duplicado(self):
        crear_publicacion(self.otro, ubicacion='Barrio Norte')

        self.assertEqual(self.crear().data['estado'], 'pendiente_moderacion')

    def test_las_observadas_llegan_al_administrador(self):
        id_observada = self.crear(descripcion='Casa linda').data['id']
        pendiente = crear_publicacion(self.otro, estado='pendiente_moderacion', ubicacion='Norte')
        crear_publicacion(self.otro, estado='activa', ubicacion='Sur')
        self.client.force_authenticate(self.administrador)

        respuesta = self.client.get(reverse('publicacion-pendientes'))

        self.assertEqual({p['id'] for p in respuesta.data}, {id_observada, pendiente.id})


class ReglasDeContenidoTests(SimpleTestCase):
    def test_no_confunde_fechas_precios_ni_medidas_con_telefonos(self):
        casos = (
            'Disponible desde el 01-11-2026 hasta el 01/12/2026.',
            'Se alquila por $ 12.500.000 anuales.',
            'Departamento de 45 m2 con 2 dormitorios y 1 baño.',
            'Requiere garantía o seguro de caución.',
        )
        for texto in casos:
            with self.subTest(texto=texto):
                self.assertFalse(tiene_datos_de_contacto(texto))

    def test_detecta_telefonos_con_distintos_formatos(self):
        for texto in ('3411234567', '341 123 4567', '+54 9 341 123-4567', '(0341) 4123456'):
            with self.subTest(texto=texto):
                self.assertTrue(tiene_datos_de_contacto(texto))

    def test_palabras_prohibidas_solo_como_palabra_completa(self):
        self.assertTrue(tiene_palabras_prohibidas('Cerca de la Marihuana'))
        self.assertTrue(tiene_palabras_prohibidas('prostitución'))
        self.assertFalse(tiene_palabras_prohibidas('Cerca de la computadora y la disputa vecinal'))


class EditarPublicacionTests(PruebaDePublicaciones):
    def test_el_dueno_edita_y_una_activa_sigue_activa(self):
        publicacion = crear_publicacion(self.propietario)

        respuesta = self.editar(publicacion, {'precio': '300000.00', 'amueblado': 'true'})

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['precio'], '300000.00')
        self.assertEqual(respuesta.data['estado'], 'activa')
        self.assertTrue(respuesta.data['amueblado'])

    def test_lo_que_no_llega_conserva_su_valor(self):
        publicacion = crear_publicacion(self.propietario, amueblado=True, acepta_mascotas=True)

        self.editar(publicacion, {'precio': '300000.00'})

        publicacion.refresh_from_db()
        self.assertTrue(publicacion.amueblado)
        self.assertEqual(publicacion.descripcion, DESCRIPCION)
        self.assertEqual(publicacion.fotos.count(), 3)

    def test_no_permite_editar_publicaciones_ajenas(self):
        publicacion = crear_publicacion(self.propietario)

        respuesta = self.editar(publicacion, {'precio': '1.00'}, como=self.otro)

        self.assertEqual(respuesta.status_code, 403)
        publicacion.refresh_from_db()
        self.assertEqual(str(publicacion.precio), '250000.00')

    def test_interesados_y_administradores_no_editan(self):
        publicacion = crear_publicacion(self.propietario)

        self.assertEqual(self.editar(publicacion, {'precio': '1'}, como=self.interesado).status_code, 403)
        self.assertEqual(self.editar(publicacion, {'precio': '1'}, como=self.administrador).status_code, 403)

    def test_el_estado_no_se_edita_por_esta_via(self):
        publicacion = crear_publicacion(self.propietario, estado='pendiente_moderacion')

        self.editar(publicacion, {'estado': 'activa', 'propietario': self.otro.id})

        publicacion.refresh_from_db()
        self.assertEqual(publicacion.estado.codigo, 'pendiente_moderacion')
        self.assertEqual(publicacion.propietario, self.propietario)

    def test_una_edicion_con_problemas_observa_la_publicacion(self):
        publicacion = crear_publicacion(self.propietario)

        respuesta = self.editar(publicacion, {'descripcion': 'Departamento lindo, llamame al 3411234567.'})

        self.assertEqual(respuesta.data['estado'], 'observada')
        self.assertIn('chat interno', respuesta.data['nota_moderacion'])

    def test_cambiar_la_documentacion_vuelve_a_revision(self):
        publicacion = crear_publicacion(self.propietario)
        archivo = SimpleUploadedFile('nueva.pdf', b'%PDF-1.4', content_type='application/pdf')

        respuesta = self.editar(publicacion, {'archivo_verificacion': archivo})

        self.assertEqual(respuesta.data['estado'], 'pendiente_moderacion')

    def test_reenviar_el_mismo_tipo_de_documento_no_vuelve_a_revision(self):
        publicacion = crear_publicacion(self.propietario)

        respuesta = self.editar(publicacion, {'tipo_documento_verificacion': 'factura_servicio'})

        self.assertEqual(respuesta.data['estado'], 'activa')

    def test_corregir_una_observada_o_rechazada_vuelve_a_revision(self):
        for estado in ('observada', 'rechazada'):
            with self.subTest(estado=estado):
                publicacion = crear_publicacion(self.propietario, estado=estado, ubicacion=estado)

                respuesta = self.editar(publicacion, {'precio': '300000.00'})

                self.assertEqual(respuesta.data['estado'], 'pendiente_moderacion')

    def test_una_pausada_sigue_pausada(self):
        publicacion = crear_publicacion(self.propietario, estado='pausada')

        self.assertEqual(self.editar(publicacion, {'precio': '300000.00'}).data['estado'], 'pausada')

    def test_no_edita_estados_cerrados(self):
        for estado in ('reservada', 'alquilada', 'archivada', 'eliminada'):
            with self.subTest(estado=estado):
                publicacion = crear_publicacion(self.propietario, estado=estado, ubicacion=estado)

                self.assertEqual(self.editar(publicacion, {'precio': '1.00'}).status_code, 400)

    def test_valida_fechas_contra_el_valor_guardado(self):
        publicacion = crear_publicacion(self.propietario)

        respuesta = self.editar(publicacion, {'disponible_hasta': '2026-10-01'})

        self.assertEqual(respuesta.status_code, 400)

    def test_pasar_a_temporario_exige_duracion(self):
        publicacion = crear_publicacion(self.propietario)

        self.assertEqual(self.editar(publicacion, {'modalidad': 'temporario'}).status_code, 400)
        self.assertEqual(
            self.editar(publicacion, {'modalidad': 'temporario', 'duracion_minima_dias': 5}).status_code, 200,
        )

    def test_agrega_y_quita_fotos(self):
        publicacion = crear_publicacion(self.propietario)
        primera = publicacion.fotos.first()

        respuesta = self.editar(publicacion, {'fotos': [imagen_de_prueba()], 'fotos_a_eliminar': [primera.id]})

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(len(respuesta.data['fotos']), 3)
        self.assertNotIn(primera.id, [foto['id'] for foto in respuesta.data['fotos']])
        self.assertEqual(respuesta.data['fotos'][-1]['orden'], 3)
        self.assertIsNotNone(FotoPublicacion.todos.get(id=primera.id).eliminado_en)

    def test_no_permite_quedar_con_menos_de_tres_fotos(self):
        publicacion = crear_publicacion(self.propietario)

        respuesta = self.editar(publicacion, {'fotos_a_eliminar': [publicacion.fotos.first().id]})

        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.data['fotos'], ['Subí como mínimo 3 fotografías.'])
        self.assertEqual(publicacion.fotos.count(), 3)

    def test_no_permite_quitar_fotos_ajenas(self):
        publicacion = crear_publicacion(self.propietario)
        ajena = crear_publicacion(self.otro, ubicacion='Norte').fotos.first()

        respuesta = self.editar(publicacion, {'fotos': [imagen_de_prueba()], 'fotos_a_eliminar': [ajena.id]})

        self.assertEqual(respuesta.status_code, 400)
        self.assertTrue(FotoPublicacion.objects.filter(id=ajena.id).exists())

    def test_permite_quitar_las_coordenadas(self):
        publicacion = crear_publicacion(self.propietario, coordenadas=Point(-62.73, -35.96, srid=4326))

        respuesta = self.editar(publicacion, {'lat': '', 'lng': ''})

        self.assertEqual(respuesta.status_code, 200)
        self.assertIsNone(respuesta.data['lat'])
        publicacion.refresh_from_db()
        self.assertIsNone(publicacion.coordenadas)

    def test_editar_otro_dato_conserva_las_coordenadas(self):
        publicacion = crear_publicacion(self.propietario, coordenadas=Point(-62.73, -35.96, srid=4326))

        self.editar(publicacion, {'precio': '300000.00'})

        publicacion.refresh_from_db()
        self.assertIsNotNone(publicacion.coordenadas)


class ConsultaDePublicacionesTests(PruebaDePublicaciones):
    def test_un_visitante_solo_ve_las_activas_en_el_listado(self):
        activa = crear_publicacion(self.propietario)
        for estado in ('pendiente_moderacion', 'pausada', 'observada', 'reservada', 'rechazada',
                       'alquilada', 'archivada', 'eliminada'):
            crear_publicacion(self.propietario, estado=estado, ubicacion=estado)

        respuesta = self.client.get(reverse('publicacion-lista'))

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual([p['id'] for p in respuesta.data['results']], [activa.id])

    def test_no_expone_datos_privados_al_publico(self):
        publicacion = crear_publicacion(self.propietario)

        for respuesta in (self.client.get(reverse('publicacion-lista')), self.client.get(self.detalle(publicacion))):
            contenido = respuesta.content.decode()
            for dato_privado in (
                self.propietario.correo, self.propietario.celular, 'motivo_suspension', 'estado_cuenta',
                'archivo_verificacion', 'tipo_documento_verificacion', 'verificaciones/', 'eventos_moderacion',
            ):
                self.assertNotIn(dato_privado, contenido)

    def test_el_detalle_publico_cubre_activas_reservadas_y_alquiladas(self):
        for estado in ('activa', 'reservada', 'alquilada'):
            with self.subTest(estado=estado):
                publicacion = crear_publicacion(self.propietario, estado=estado, ubicacion=estado)

                self.assertEqual(self.client.get(self.detalle(publicacion)).status_code, 200)

    def test_el_resto_de_los_estados_no_existe_para_el_publico(self):
        for estado in ('pendiente_moderacion', 'pausada', 'observada', 'rechazada', 'archivada', 'eliminada'):
            with self.subTest(estado=estado):
                publicacion = crear_publicacion(self.propietario, estado=estado, ubicacion=estado)

                self.assertEqual(self.client.get(self.detalle(publicacion)).status_code, 404)

    def test_otro_anunciante_tampoco_ve_publicaciones_ocultas(self):
        publicacion = crear_publicacion(self.propietario, estado='pausada')
        self.client.force_authenticate(self.otro)

        self.assertEqual(self.client.get(self.detalle(publicacion)).status_code, 404)

    def test_otro_usuario_ve_la_version_publica_de_una_activa(self):
        publicacion = crear_publicacion(self.propietario)
        self.client.force_authenticate(self.otro)

        self.assertNotIn('archivo_verificacion', self.client.get(self.detalle(publicacion)).data)

    def test_el_dueno_y_el_administrador_ven_la_version_interna(self):
        publicacion = crear_publicacion(self.propietario, estado='pausada')

        for usuario in (self.propietario, self.administrador):
            with self.subTest(usuario=usuario.correo):
                self.client.force_authenticate(usuario)

                respuesta = self.client.get(self.detalle(publicacion))

                self.assertEqual(respuesta.status_code, 200)
                self.assertIn('archivo_verificacion', respuesta.data)

    def test_identifica_a_la_inmobiliaria_responsable(self):
        self.inmobiliaria.razon_social = 'Inmobiliaria Centro'
        self.inmobiliaria.save()
        publicacion = crear_publicacion(self.inmobiliaria)

        propietario = self.client.get(self.detalle(publicacion)).data['propietario']

        self.assertEqual(propietario['razon_social'], 'Inmobiliaria Centro')
        self.assertEqual(propietario['rol'], 'inmobiliaria')

    def test_una_publicacion_inexistente_devuelve_404(self):
        self.assertEqual(self.client.get(reverse('publicacion-detalle', args=[999999])).status_code, 404)


class FiltrosDeBusquedaTests(PruebaDePublicaciones):
    def ids(self, **filtros):
        respuesta = self.client.get(reverse('publicacion-lista'), filtros)
        self.assertEqual(respuesta.status_code, 200)
        return {publicacion['id'] for publicacion in respuesta.data['results']}

    def test_sin_filtros_devuelve_todas_las_activas(self):
        activa = crear_publicacion(self.propietario)

        self.assertEqual(self.ids(), {activa.id})

    def test_filtra_por_modalidad_y_tipo(self):
        depto = crear_publicacion(self.propietario, ubicacion='Centro')
        casa = crear_publicacion(self.propietario, tipo_inmueble='casa', ubicacion='Norte')
        temporario = crear_publicacion(self.propietario, modalidad='temporario', ubicacion='Sur')

        self.assertEqual(self.ids(modalidad='residencial'), {depto.id, casa.id})
        self.assertEqual(self.ids(tipo_inmueble='casa'), {casa.id})
        self.assertEqual(self.ids(modalidad='temporario', tipo_inmueble='departamento'), {temporario.id})

    def test_filtra_por_rango_de_precio_incluyendo_los_extremos(self):
        barata = crear_publicacion(self.propietario, precio='100000.00', ubicacion='A')
        media = crear_publicacion(self.propietario, precio='200000.00', ubicacion='B')
        crear_publicacion(self.propietario, precio='300000.00', ubicacion='C')

        self.assertEqual(self.ids(precio_max='200000'), {barata.id, media.id})
        self.assertEqual(self.ids(precio_min='200000', precio_max='200000'), {media.id})

    def test_ambientes_y_dormitorios_funcionan_como_minimos(self):
        chico = crear_publicacion(self.propietario, ambientes=1, dormitorios=0, ubicacion='A')
        grande = crear_publicacion(self.propietario, ambientes=4, dormitorios=3, ubicacion='B')

        self.assertEqual(self.ids(ambientes_min=2), {grande.id})
        self.assertEqual(self.ids(dormitorios_min=3), {grande.id})
        self.assertEqual(self.ids(ambientes_min=0), {chico.id, grande.id})

    def test_la_ubicacion_ignora_acentos_y_mayusculas(self):
        trenque = crear_publicacion(self.propietario, ubicacion='Barrio Belgrano, Trenque Lauquén')
        crear_publicacion(self.propietario, ubicacion='Centro, Pehuajó')

        self.assertEqual(self.ids(ubicacion='lauquen'), {trenque.id})
        self.assertEqual(self.ids(ubicacion='BELGRANO'), {trenque.id})
        self.assertEqual(self.ids(ubicacion='LAUQUÉN'), {trenque.id})
        self.assertEqual(self.ids(ubicacion='inexistente'), set())

    def test_las_caracteristicas_solo_filtran_cuando_se_piden(self):
        con_mascotas = crear_publicacion(self.propietario, acepta_mascotas=True, ubicacion='A')
        sin_mascotas = crear_publicacion(self.propietario, ubicacion='B')

        self.assertEqual(self.ids(acepta_mascotas='true'), {con_mascotas.id})
        self.assertEqual(self.ids(acepta_mascotas='1'), {con_mascotas.id})
        self.assertEqual(self.ids(acepta_mascotas='false'), {con_mascotas.id, sin_mascotas.id})

    def test_combina_varios_filtros(self):
        buscada = crear_publicacion(self.propietario, tipo_inmueble='casa', amueblado=True, ubicacion='A')
        crear_publicacion(self.propietario, tipo_inmueble='casa', ubicacion='B')
        crear_publicacion(self.propietario, amueblado=True, ubicacion='C')

        self.assertEqual(self.ids(tipo_inmueble='casa', amueblado='true'), {buscada.id})

    def test_nunca_muestra_publicaciones_que_no_esten_activas(self):
        crear_publicacion(self.propietario, estado='pausada', tipo_inmueble='casa')

        self.assertEqual(self.ids(tipo_inmueble='casa'), set())

    def test_ignora_parametros_vacios(self):
        activa = crear_publicacion(self.propietario)

        self.assertEqual(self.ids(modalidad='', ubicacion='', precio_min=''), {activa.id})

    def test_rechaza_filtros_invalidos(self):
        for filtros in (
            {'precio_min': 'abc'},
            {'precio_min': '-1'},
            {'modalidad': 'inventada'},
            {'tipo_inmueble': 'inventado'},
            {'ambientes_min': 'muchos'},
            {'fecha_ingreso': 'ayer'},
            {'precio_min': '300', 'precio_max': '200'},
            {'fecha_ingreso': '2026-12-10', 'fecha_salida': '2026-12-10'},
        ):
            with self.subTest(filtros=filtros):
                self.assertEqual(self.client.get(reverse('publicacion-lista'), filtros).status_code, 400)

    def test_pagina_de_a_nueve(self):
        for numero in range(10):
            crear_publicacion(self.propietario, ubicacion=f'Zona {numero}')

        primera = self.client.get(reverse('publicacion-lista')).data
        segunda = self.client.get(reverse('publicacion-lista'), {'pagina': 2}).data

        self.assertEqual(primera['count'], 10)
        self.assertEqual(len(primera['results']), 9)
        self.assertEqual(len(segunda['results']), 1)
        self.assertFalse({p['id'] for p in primera['results']} & {p['id'] for p in segunda['results']})


class FiltroDeEstadiaTests(PruebaDePublicaciones):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.temporario = crear_publicacion(
            cls.propietario,
            modalidad='temporario',
            duracion_minima_dias=7,
            disponible_desde='2026-12-01',
            disponible_hasta='2026-12-20',
        )

    def encuentra(self, **filtros):
        ids = {p['id'] for p in self.client.get(reverse('publicacion-lista'), filtros).data['results']}
        return self.temporario.id in ids

    def test_acepta_una_estadia_cubierta_completa(self):
        self.assertTrue(self.encuentra(fecha_ingreso='2026-12-05', fecha_salida='2026-12-15'))
        self.assertTrue(self.encuentra(fecha_ingreso='2026-12-01', fecha_salida='2026-12-20'))

    def test_rechaza_una_estadia_que_solo_se_superpone(self):
        self.assertFalse(self.encuentra(fecha_ingreso='2026-12-15', fecha_salida='2026-12-25'))
        self.assertFalse(self.encuentra(fecha_ingreso='2026-11-25', fecha_salida='2026-12-05'))

    def test_rechaza_una_estadia_menor_a_la_duracion_minima(self):
        self.assertFalse(self.encuentra(fecha_ingreso='2026-12-05', fecha_salida='2026-12-08'))
        self.assertTrue(self.encuentra(fecha_ingreso='2026-12-05', fecha_salida='2026-12-12'))

    def test_filtra_por_duracion_de_estadia(self):
        self.assertFalse(self.encuentra(duracion_estadia=6))
        self.assertTrue(self.encuentra(duracion_estadia=7))

    def test_acepta_una_sola_fecha(self):
        self.assertTrue(self.encuentra(fecha_ingreso='2026-12-10'))
        self.assertFalse(self.encuentra(fecha_ingreso='2026-12-21'))
        self.assertFalse(self.encuentra(fecha_salida='2026-11-30'))

    def test_una_disponibilidad_sin_fecha_final_cubre_cualquier_salida(self):
        abierta = crear_publicacion(
            self.propietario, modalidad='temporario', duracion_minima_dias=7,
            disponible_desde='2026-12-01', ubicacion='Abierta',
        )

        ids = {
            p['id'] for p in self.client.get(
                reverse('publicacion-lista'), {'fecha_ingreso': '2027-03-01', 'fecha_salida': '2027-03-15'},
            ).data['results']
        }

        self.assertIn(abierta.id, ids)

    def test_las_fechas_no_afectan_a_los_alquileres_residenciales(self):
        residencial = crear_publicacion(self.propietario, ubicacion='Residencial')

        ids = {
            p['id'] for p in self.client.get(
                reverse('publicacion-lista'), {'fecha_ingreso': '2030-01-01', 'fecha_salida': '2030-01-10'},
            ).data['results']
        }

        self.assertIn(residencial.id, ids)
        self.assertNotIn(self.temporario.id, ids)


class MisPublicacionesTests(PruebaDePublicaciones):
    def listar(self, **filtros):
        return self.client.get(reverse('publicacion-mias'), filtros)

    def setUp(self):
        self.client.force_authenticate(self.propietario)

    def test_lista_todas_las_propias_en_cualquier_estado(self):
        estados = ('pendiente_moderacion', 'activa', 'eliminada', 'archivada')
        for estado in estados:
            crear_publicacion(self.propietario, estado=estado, ubicacion=estado)
        crear_publicacion(self.otro, ubicacion='Ajena')

        respuesta = self.listar()

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual({p['estado'] for p in respuesta.data['results']}, set(estados))
        self.assertEqual(respuesta.data['count'], 4)

    def test_filtra_por_estado_y_conserva_los_totales(self):
        crear_publicacion(self.propietario, estado='activa', ubicacion='A')
        crear_publicacion(self.propietario, estado='activa', ubicacion='B')
        pausada = crear_publicacion(self.propietario, estado='pausada', ubicacion='C')

        respuesta = self.listar(estado='pausada')

        self.assertEqual([p['id'] for p in respuesta.data['results']], [pausada.id])
        self.assertEqual(respuesta.data['totales'], {'activa': 2, 'pausada': 1})

    def test_rechaza_un_estado_inexistente(self):
        self.assertEqual(self.listar(estado='inventado').status_code, 400)

    def test_pagina_de_a_seis(self):
        for numero in range(7):
            crear_publicacion(self.propietario, ubicacion=f'Zona {numero}')

        self.assertEqual(len(self.listar().data['results']), 6)
        self.assertEqual(len(self.listar(pagina=2).data['results']), 1)

    def test_indica_las_acciones_permitidas_de_cada_estado(self):
        esperadas = {
            'activa': ['editar', 'pausar', 'reservar', 'marcar_alquilada', 'eliminar'],
            'pausada': ['editar', 'reactivar', 'eliminar'],
            'reservada': ['reactivar', 'marcar_alquilada', 'eliminar'],
            'alquilada': ['reactivar', 'eliminar'],
            'observada': ['editar', 'eliminar'],
            'archivada': ['eliminar'],
            'eliminada': [],
        }
        for estado in esperadas:
            crear_publicacion(self.propietario, estado=estado, ubicacion=estado)

        publicaciones = []
        for pagina in (1, 2):
            publicaciones += self.listar(pagina=pagina).data['results']

        self.assertEqual({p['estado']: p['acciones'] for p in publicaciones}, esperadas)

    def test_muestra_los_datos_internos_y_la_nota_de_moderacion(self):
        publicacion = crear_publicacion(self.propietario, estado='observada')
        EventoModeracion.objects.create(publicacion=publicacion, tipo='solicitud_modificacion', nota='Falta una foto.')

        datos = self.listar().data['results'][0]

        self.assertEqual(datos['nota_moderacion'], 'Falta una foto.')
        self.assertIn('archivo_verificacion', datos)

    def test_solo_propietarios_e_inmobiliarias_acceden(self):
        for usuario, codigo in ((self.interesado, 403), (self.administrador, 403), (None, 401)):
            with self.subTest(usuario=usuario):
                self.client.force_authenticate(usuario)

                self.assertEqual(self.listar().status_code, codigo)

    def test_la_inmobiliaria_tiene_su_propio_panel(self):
        propia = crear_publicacion(self.inmobiliaria, ubicacion='Inmobiliaria')
        crear_publicacion(self.propietario, ubicacion='Particular')
        self.client.force_authenticate(self.inmobiliaria)

        self.assertEqual([p['id'] for p in self.listar().data['results']], [propia.id])


class EstadosDePublicacionTests(PruebaDePublicaciones):
    def cambiar(self, publicacion, estado, como=None):
        self.client.force_authenticate(como or publicacion.propietario)
        return self.client.post(
            reverse('publicacion-estado', args=[publicacion.id]), {'estado': estado}, format='json',
        )

    def test_transiciones_permitidas(self):
        for origen, destino in (
            ('activa', 'pausada'), ('activa', 'reservada'), ('activa', 'alquilada'), ('pausada', 'activa'),
            ('reservada', 'activa'), ('reservada', 'alquilada'), ('alquilada', 'activa'),
        ):
            with self.subTest(origen=origen, destino=destino):
                publicacion = crear_publicacion(self.propietario, estado=origen, ubicacion=f'{origen}-{destino}')

                respuesta = self.cambiar(publicacion, destino)

                self.assertEqual(respuesta.status_code, 200)
                self.assertEqual(respuesta.data['estado'], destino)

    def test_transiciones_prohibidas(self):
        for origen, destino in (
            ('pendiente_moderacion', 'activa'), ('observada', 'activa'), ('rechazada', 'activa'),
            ('archivada', 'activa'), ('eliminada', 'activa'), ('pausada', 'alquilada'),
            ('activa', 'archivada'), ('activa', 'eliminada'), ('activa', 'inventado'),
        ):
            with self.subTest(origen=origen, destino=destino):
                publicacion = crear_publicacion(self.propietario, estado=origen, ubicacion=f'{origen}-{destino}')

                self.assertEqual(self.cambiar(publicacion, destino).status_code, 400)
                self.assertEqual(self.codigo_de_estado(publicacion), origen)

    def test_marcar_alquilada_guarda_la_fecha(self):
        publicacion = crear_publicacion(self.propietario)

        self.cambiar(publicacion, 'alquilada')

        publicacion.refresh_from_db()
        self.assertIsNotNone(publicacion.alquilada_en)

    def test_reactivar_una_alquilada_borra_la_fecha(self):
        publicacion = crear_publicacion(self.propietario, estado='alquilada', alquilada_en=timezone.now())

        self.cambiar(publicacion, 'activa')

        publicacion.refresh_from_db()
        self.assertIsNone(publicacion.alquilada_en)

    def test_no_permite_cambiar_el_estado_de_publicaciones_ajenas(self):
        publicacion = crear_publicacion(self.propietario)

        self.assertEqual(self.cambiar(publicacion, 'pausada', como=self.otro).status_code, 403)
        self.assertEqual(self.codigo_de_estado(publicacion), 'activa')


class ArchivadoAutomaticoTests(PruebaDePublicaciones):
    def alquilada_hace(self, **tiempo):
        return crear_publicacion(
            self.propietario,
            estado='alquilada',
            alquilada_en=timezone.now() - timedelta(**tiempo),
            ubicacion=str(tiempo),
        )

    def test_archiva_a_los_siete_dias(self):
        vencida = self.alquilada_hace(days=7)
        muy_vencida = self.alquilada_hace(days=30)
        salida = StringIO()

        call_command('archivar_publicaciones', stdout=salida)

        self.assertEqual(self.codigo_de_estado(vencida), 'archivada')
        self.assertEqual(self.codigo_de_estado(muy_vencida), 'archivada')
        self.assertIn('Publicaciones archivadas: 2', salida.getvalue())

    def test_no_archiva_antes_de_los_siete_dias(self):
        reciente = self.alquilada_hace(days=6, hours=23)

        call_command('archivar_publicaciones', stdout=StringIO())

        self.assertEqual(self.codigo_de_estado(reciente), 'alquilada')

    def test_solo_afecta_a_las_alquiladas(self):
        pausada = crear_publicacion(
            self.propietario, estado='pausada', alquilada_en=timezone.now() - timedelta(days=30),
        )

        call_command('archivar_publicaciones', stdout=StringIO())

        self.assertEqual(self.codigo_de_estado(pausada), 'pausada')

    def test_una_archivada_deja_de_verse_publicamente(self):
        vencida = self.alquilada_hace(days=8)
        self.assertEqual(self.client.get(self.detalle(vencida)).status_code, 200)

        call_command('archivar_publicaciones', stdout=StringIO())

        self.assertEqual(self.client.get(self.detalle(vencida)).status_code, 404)


class EliminacionLogicaTests(PruebaDePublicaciones):
    def eliminar(self, publicacion, como=None):
        self.client.force_authenticate(como or publicacion.propietario)
        return self.client.delete(self.detalle(publicacion))

    def test_conserva_el_registro_con_estado_eliminada(self):
        publicacion = crear_publicacion(self.propietario)

        respuesta = self.eliminar(publicacion)

        self.assertEqual(respuesta.status_code, 204)
        self.assertEqual(self.codigo_de_estado(publicacion), 'eliminada')
        self.assertEqual(publicacion.fotos.count(), 3)

    def test_deja_de_estar_disponible_publicamente(self):
        publicacion = crear_publicacion(self.propietario)

        self.eliminar(publicacion)
        self.client.force_authenticate(None)

        self.assertEqual(self.client.get(self.detalle(publicacion)).status_code, 404)
        self.assertEqual(self.client.get(reverse('publicacion-lista')).data['results'], [])

    def test_el_dueno_la_sigue_viendo_en_su_historial(self):
        publicacion = crear_publicacion(self.propietario)

        self.eliminar(publicacion)

        self.assertEqual(self.client.get(self.detalle(publicacion)).status_code, 200)

    def test_queda_registrada_en_la_auditoria(self):
        publicacion = crear_publicacion(self.propietario, estado='pausada')

        self.eliminar(publicacion)

        registro = RegistroAuditoria.objects.get()
        self.assertEqual(registro.tipo_accion, 'eliminacion_logica')
        self.assertEqual(registro.actor, self.propietario)
        self.assertEqual(registro.referencia, publicacion)
        self.assertEqual(registro.detalle, 'Estado anterior: pausada')

    def test_se_puede_eliminar_desde_cualquier_estado_abierto(self):
        for estado in ('pendiente_moderacion', 'pausada', 'observada', 'reservada', 'rechazada',
                       'alquilada', 'archivada'):
            with self.subTest(estado=estado):
                publicacion = crear_publicacion(self.propietario, estado=estado, ubicacion=estado)

                self.assertEqual(self.eliminar(publicacion).status_code, 204)

    def test_no_se_elimina_dos_veces(self):
        publicacion = crear_publicacion(self.propietario, estado='eliminada')

        self.assertEqual(self.eliminar(publicacion).status_code, 400)
        self.assertFalse(RegistroAuditoria.objects.exists())

    def test_no_permite_eliminar_publicaciones_ajenas(self):
        publicacion = crear_publicacion(self.propietario)

        self.assertEqual(self.eliminar(publicacion, como=self.otro).status_code, 403)
        self.assertEqual(self.eliminar(publicacion, como=self.administrador).status_code, 403)
        self.assertEqual(self.codigo_de_estado(publicacion), 'activa')


class AccionesDelAdministradorTests(PruebaDePublicaciones):
    def setUp(self):
        self.publicacion = crear_publicacion(self.propietario, estado='pendiente_moderacion')
        self.client.force_authenticate(self.administrador)

    def accion(self, nombre, publicacion=None, **datos):
        url = reverse(f'publicacion-{nombre}', args=[(publicacion or self.publicacion).id])
        return self.client.post(url, datos, format='json')

    def test_aprobar_activa_y_audita(self):
        respuesta = self.accion('aprobar')

        self.assertEqual(respuesta.data['estado'], 'activa')
        registro = RegistroAuditoria.objects.get()
        self.assertEqual(registro.tipo_accion, 'aprobacion_publicacion')
        self.assertEqual(registro.actor, self.administrador)

    def test_rechazar_expone_el_motivo_y_registra_al_administrador(self):
        respuesta = self.accion('rechazar', nota='La factura no coincide.')

        self.assertEqual(respuesta.data['estado'], 'rechazada')
        self.assertEqual(respuesta.data['motivo_rechazo_verificacion'], 'La factura no coincide.')
        self.assertEqual(EventoModeracion.objects.get().administrador, self.administrador)
        self.assertEqual(RegistroAuditoria.objects.get().tipo_accion, 'rechazo_publicacion')

    def test_solicitar_modificaciones_expone_la_nota(self):
        respuesta = self.accion('solicitar-modificaciones', nota='Falta una foto del baño.')

        self.assertEqual(respuesta.data['estado'], 'observada')
        self.assertEqual(respuesta.data['nota_moderacion'], 'Falta una foto del baño.')

    def test_rechazar_exige_motivo(self):
        self.assertEqual(self.accion('rechazar').status_code, 400)
        self.assertEqual(self.codigo_de_estado(self.publicacion), 'pendiente_moderacion')

    def test_el_motivo_del_rechazo_se_limpia_al_aprobar_de_nuevo(self):
        self.accion('rechazar', nota='La factura no coincide.')
        self.client.force_authenticate(self.propietario)
        self.client.patch(self.detalle(self.publicacion), {'precio': '300000.00'}, format='multipart')
        self.client.force_authenticate(self.administrador)

        respuesta = self.accion('aprobar')

        self.assertIsNone(respuesta.data['motivo_rechazo_verificacion'])
        self.assertEqual(len(respuesta.data['eventos_moderacion']), 1)

    def test_una_observada_tambien_se_puede_aprobar(self):
        observada = crear_publicacion(self.propietario, estado='observada', ubicacion='Norte')

        self.assertEqual(self.accion('aprobar', observada).data['estado'], 'activa')

    def test_no_modera_publicaciones_fuera_de_revision(self):
        for estado in ('activa', 'pausada', 'rechazada', 'eliminada', 'archivada'):
            with self.subTest(estado=estado):
                publicacion = crear_publicacion(self.propietario, estado=estado, ubicacion=estado)

                self.assertEqual(self.accion('aprobar', publicacion).status_code, 400)
                self.assertEqual(self.codigo_de_estado(publicacion), estado)

    def test_solo_el_administrador_modera(self):
        self.client.force_authenticate(self.propietario)

        self.assertEqual(self.accion('aprobar').status_code, 403)
        self.assertEqual(self.client.get(reverse('publicacion-pendientes')).status_code, 403)


class RevisionAdministrativaTests(PruebaDePublicaciones):
    def setUp(self):
        self.client.force_authenticate(self.administrador)

    def accion(self, nombre, publicacion, **datos):
        return self.client.post(reverse(f'publicacion-{nombre}', args=[publicacion.id]), datos, format='json')

    def test_lista_todas_las_publicaciones_con_totales(self):
        for estado in ('activa', 'observada', 'eliminada'):
            crear_publicacion(self.propietario, estado=estado, ubicacion=estado)
        crear_publicacion(self.otro, estado='activa', ubicacion='Otro')

        respuesta = self.client.get(reverse('publicacion-administracion'))
        observadas = self.client.get(reverse('publicacion-administracion'), {'estado': 'observada'})

        self.assertEqual(respuesta.data['count'], 4)
        self.assertEqual(respuesta.data['totales'], {'activa': 2, 'observada': 1, 'eliminada': 1})
        self.assertEqual([p['estado'] for p in observadas.data['results']], ['observada'])
        self.assertIn('archivo_verificacion', respuesta.data['results'][0])

    def test_mantener_observada_registra_la_decision_sin_cambiar_el_estado(self):
        publicacion = crear_publicacion(self.propietario, estado='observada')

        respuesta = self.accion('mantener-observada', publicacion, nota='Todavía falta la foto del baño.')

        self.assertEqual(respuesta.data['estado'], 'observada')
        self.assertEqual(respuesta.data['nota_moderacion'], 'Todavía falta la foto del baño.')
        self.assertEqual(RegistroAuditoria.objects.get().tipo_accion, 'mantener_observada')
        self.assertIn('sigue observada', self.propietario.notificaciones.get().mensaje)

    def test_solo_se_mantiene_observada_una_observada(self):
        publicacion = crear_publicacion(self.propietario, estado='pendiente_moderacion')

        respuesta = self.accion('mantener-observada', publicacion, nota='Nota')

        self.assertEqual(respuesta.status_code, 400)
        self.assertFalse(EventoModeracion.objects.exists())

    def test_ocultar_saca_la_publicacion_del_publico_y_avisa(self):
        publicacion = crear_publicacion(self.propietario)

        respuesta = self.accion('ocultar', publicacion, nota='Reclamos reiterados por fotos falsas.')

        self.assertEqual(respuesta.data['estado'], 'oculta')
        self.assertEqual(respuesta.data['motivo_ocultamiento'], 'Reclamos reiterados por fotos falsas.')
        self.assertEqual(RegistroAuditoria.objects.get().tipo_accion, 'ocultamiento_publicacion')
        self.assertIn('ocultó tu publicación', self.propietario.notificaciones.get().mensaje)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.detalle(publicacion)).status_code, 404)
        self.assertEqual(self.client.get(reverse('publicacion-lista')).data['results'], [])

    def test_el_dueno_ve_la_oculta_pero_no_puede_reactivarla_ni_editarla(self):
        publicacion = crear_publicacion(self.propietario)
        self.accion('ocultar', publicacion, nota='Motivo')
        self.client.force_authenticate(self.propietario)

        self.assertEqual(self.client.get(self.detalle(publicacion)).data['motivo_ocultamiento'], 'Motivo')
        self.assertEqual(
            self.client.post(reverse('publicacion-estado', args=[publicacion.id]), {'estado': 'activa'}).status_code,
            400,
        )
        self.assertEqual(self.editar(publicacion, {'precio': '1.00'}).status_code, 400)
        mias = self.client.get(reverse('publicacion-mias')).data['results']
        self.assertEqual(mias[0]['acciones'], ['eliminar'])

    def test_no_oculta_publicaciones_ya_fuera_del_publico(self):
        for estado in ('oculta', 'eliminada', 'archivada'):
            with self.subTest(estado=estado):
                publicacion = crear_publicacion(self.propietario, estado=estado, ubicacion=estado)

                self.assertEqual(self.accion('ocultar', publicacion, nota='Motivo').status_code, 400)

    def test_ocultar_y_mantener_exigen_nota(self):
        publicacion = crear_publicacion(self.propietario, estado='observada')

        for accion in ('ocultar', 'mantener-observada'):
            with self.subTest(accion=accion):
                self.assertEqual(self.accion(accion, publicacion).status_code, 400)

    def test_volver_a_mostrar_una_oculta(self):
        publicacion = crear_publicacion(self.propietario)
        self.accion('ocultar', publicacion, nota='Motivo')

        respuesta = self.accion('mostrar', publicacion)

        self.assertEqual(respuesta.data['estado'], 'activa')
        self.assertIsNone(respuesta.data['motivo_ocultamiento'])
        self.assertEqual(
            list(RegistroAuditoria.objects.order_by('id').values_list('tipo_accion', flat=True)),
            ['ocultamiento_publicacion', 'restauracion_publicacion'],
        )
        self.assertEqual(self.accion('mostrar', publicacion).status_code, 400)

    def test_ocultar_avisa_a_quienes_la_tienen_en_favoritos(self):
        publicacion = crear_publicacion(self.propietario)
        Favorito.objects.create(usuario=self.interesado, publicacion=publicacion)

        self.accion('ocultar', publicacion, nota='Motivo')

        self.assertIn('ya no está disponible', self.interesado.notificaciones.get().mensaje)

    def test_solo_el_administrador_accede_a_la_revision(self):
        publicacion = crear_publicacion(self.propietario)
        self.client.force_authenticate(self.propietario)

        self.assertEqual(self.client.get(reverse('publicacion-administracion')).status_code, 403)
        for accion in ('ocultar', 'mostrar', 'mantener-observada'):
            with self.subTest(accion=accion):
                self.assertEqual(self.accion(accion, publicacion, nota='Nota').status_code, 403)


class DocumentoDeVerificacionTests(PruebaDePublicaciones):
    def crear_con_documento(self):
        self.client.force_authenticate(self.propietario)
        respuesta = self.client.post(reverse('publicacion-lista'), {
            'tipo_inmueble': 'departamento', 'modalidad': 'residencial', 'descripcion': DESCRIPCION,
            'precio': '250000.00', 'ubicacion': 'Centro', 'ambientes': 2, 'dormitorios': 1,
            'disponible_desde': '2026-11-01', 'tipo_documento_verificacion': 'factura_servicio',
            'archivo_verificacion': SimpleUploadedFile(
                'factura.pdf', b'%PDF-1.4 privado', content_type='application/pdf',
            ),
            'fotos': [imagen_de_prueba(f'foto{i}.jpg') for i in range(3)],
        }, format='multipart')
        return Publicacion.objects.get(id=respuesta.data['id']), respuesta

    def documento(self, publicacion):
        return self.client.get(reverse('publicacion-documento', args=[publicacion.id]))

    def test_el_documento_no_queda_en_la_carpeta_publica(self):
        publicacion, respuesta = self.crear_con_documento()
        nombre = publicacion.archivo_verificacion.name

        self.assertTrue(respuesta.data['archivo_verificacion'].endswith(f'/api/publicaciones/{publicacion.id}/documento/'))
        self.assertTrue(os.path.exists(os.path.join(PRIVADO_TEMPORAL, nombre)))
        self.assertFalse(os.path.exists(os.path.join(MEDIA_TEMPORAL, nombre)))
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(f'/media/{nombre}').status_code, 404)

    def test_el_dueno_y_el_administrador_lo_descargan(self):
        publicacion, _ = self.crear_con_documento()

        for usuario in (self.propietario, self.administrador):
            with self.subTest(usuario=usuario.correo):
                self.client.force_authenticate(usuario)
                respuesta = self.documento(publicacion)

                self.assertEqual(respuesta.status_code, 200)
                self.assertEqual(b''.join(respuesta.streaming_content), b'%PDF-1.4 privado')

    def test_nadie_mas_lo_descarga(self):
        publicacion, _ = self.crear_con_documento()

        for usuario, codigo in ((self.otro, 404), (self.interesado, 404), (None, 401)):
            with self.subTest(usuario=usuario):
                self.client.force_authenticate(usuario)

                self.assertEqual(self.documento(publicacion).status_code, codigo)

    def test_un_archivo_faltante_tiene_un_mensaje_claro(self):
        publicacion = crear_publicacion(self.propietario, archivo_verificacion='verificaciones/no_existe.pdf')
        self.client.force_authenticate(self.propietario)

        respuesta = self.documento(publicacion)

        self.assertEqual(respuesta.status_code, 404)
        self.assertEqual(respuesta.data['detail'], 'El documento no está disponible.')

    def test_con_cloudinary_redirige_a_un_enlace_firmado(self):
        publicacion = crear_publicacion(self.propietario, archivo_verificacion='verificaciones/abc.pdf')
        privado = AlmacenamientoCloudinary(privado=True, tipo_recurso='raw')
        campo = Publicacion._meta.get_field('archivo_verificacion')
        self.client.force_authenticate(self.propietario)

        with mock.patch.object(campo, 'storage', privado), \
                mock.patch.object(privado, 'url', return_value='https://api.cloudinary.com/firmado'):
            respuesta = self.documento(publicacion)

        self.assertEqual(respuesta.status_code, 302)
        self.assertEqual(respuesta['Location'], 'https://api.cloudinary.com/firmado')
