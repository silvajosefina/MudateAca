from datetime import timedelta
from io import StringIO

from django.core.management import call_command
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from busquedas.models import BusquedaActiva, EstadoBusqueda
from favoritos.models import Favorito
from publicaciones.models import EstadoPublicacion, Publicacion
from publicaciones.tests import crear_publicacion, crear_usuario

from .models import Notificacion
from .servicios import notificar


class PruebaDeNotificaciones(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.interesado = crear_usuario('interesado@mudateaca.com', rol='interesado')
        cls.otro_interesado = crear_usuario('otro.interesado@mudateaca.com', rol='interesado')
        cls.propietario = crear_usuario('propietario@mudateaca.com')
        cls.administrador = crear_usuario('admin@mudateaca.com', rol='administrador')

    def mensajes_de(self, usuario):
        return list(usuario.notificaciones.order_by('id').values_list('mensaje', flat=True))


class ConsultaDeNotificacionesTests(PruebaDeNotificaciones):
    def setUp(self):
        self.client.force_authenticate(self.interesado)

    def test_lista_solo_las_propias_de_la_mas_nueva_a_la_mas_vieja(self):
        notificar([self.interesado], 'Primera')
        notificar([self.interesado], 'Segunda', 'error')
        notificar([self.otro_interesado], 'Ajena')

        respuesta = self.client.get(reverse('notificacion-lista'))

        self.assertEqual([n['mensaje'] for n in respuesta.data['results']], ['Segunda', 'Primera'])
        self.assertEqual(respuesta.data['results'][0]['tipo'], 'error')

    def test_pagina_de_a_diez(self):
        for numero in range(11):
            notificar([self.interesado], f'Aviso {numero}')

        respuesta = self.client.get(reverse('notificacion-lista'))

        self.assertEqual(respuesta.data['count'], 11)
        self.assertEqual(len(respuesta.data['results']), 10)

    def test_informa_el_objeto_al_que_se_refiere(self):
        publicacion = crear_publicacion(self.propietario)
        notificar([self.interesado], 'Con referencia', referencia=publicacion)
        notificar([self.interesado], 'Sin referencia')

        resultados = self.client.get(reverse('notificacion-lista')).data['results']

        self.assertIsNone(resultados[0]['referencia'])
        self.assertEqual(resultados[1]['referencia'], {'tipo': 'publicacion', 'id': publicacion.id})

    def test_cuenta_y_marca_las_no_leidas(self):
        notificar([self.interesado], 'Uno')
        notificar([self.interesado], 'Dos')
        notificar([self.otro_interesado], 'Ajena')

        self.assertEqual(self.client.get(reverse('notificacion-no-leidas')).data, {'cantidad': 2})
        self.assertEqual(self.client.post(reverse('notificacion-marcar-leidas')).data, {'marcadas': 2})
        self.assertEqual(self.client.get(reverse('notificacion-no-leidas')).data, {'cantidad': 0})
        self.assertFalse(self.otro_interesado.notificaciones.get().leida)

    def test_elimina_una_o_todas_las_propias(self):
        notificar([self.interesado], 'Uno')
        notificar([self.interesado], 'Dos')
        notificar([self.otro_interesado], 'Ajena')
        primera = self.interesado.notificaciones.order_by('id').first()

        self.assertEqual(self.client.delete(reverse('notificacion-detalle', args=[primera.id])).status_code, 204)
        self.assertEqual(self.mensajes_de(self.interesado), ['Dos'])
        self.assertEqual(self.client.delete(reverse('notificacion-lista')).status_code, 204)
        self.assertEqual(self.mensajes_de(self.interesado), [])
        self.assertEqual(self.mensajes_de(self.otro_interesado), ['Ajena'])
        self.assertEqual(Notificacion.todos.filter(usuario=self.interesado, eliminado_en__isnull=False).count(), 2)
        self.assertEqual(self.client.get(reverse('notificacion-no-leidas')).data, {'cantidad': 0})

    def test_sin_notificaciones_las_acciones_masivas_no_fallan(self):
        self.assertEqual(self.client.post(reverse('notificacion-marcar-leidas')).data, {'marcadas': 0})
        self.assertEqual(self.client.delete(reverse('notificacion-lista')).status_code, 204)
        self.assertEqual(self.client.get(reverse('notificacion-lista')).data['results'], [])

    def test_una_pagina_invalida_o_un_metodo_no_permitido_tienen_mensaje_claro(self):
        self.assertEqual(self.client.get(reverse('notificacion-lista'), {'pagina': 0}).data['detail'], 'Página inválida.')
        self.assertEqual(
            self.client.put(reverse('notificacion-lista'), {}, format='json').data['detail'], 'Método "PUT" no permitido.',
        )

    def test_no_permite_borrar_notificaciones_ajenas(self):
        notificar([self.otro_interesado], 'Ajena')
        ajena = self.otro_interesado.notificaciones.get()

        self.assertEqual(self.client.delete(reverse('notificacion-detalle', args=[ajena.id])).status_code, 404)
        self.assertTrue(Notificacion.objects.filter(id=ajena.id).exists())

    def test_cualquier_rol_tiene_notificaciones_pero_no_los_visitantes(self):
        for usuario in (self.propietario, self.administrador):
            with self.subTest(usuario=usuario.correo):
                self.client.force_authenticate(usuario)
                self.assertEqual(self.client.get(reverse('notificacion-lista')).status_code, 200)

        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(reverse('notificacion-no-leidas')).status_code, 401)


class AvisosDeFavoritosTests(PruebaDeNotificaciones):
    def setUp(self):
        self.publicacion = crear_publicacion(self.propietario)
        Favorito.objects.create(usuario=self.interesado, publicacion=self.publicacion)

    def cambiar_estado(self, codigo):
        self.client.force_authenticate(self.propietario)
        return self.client.post(
            reverse('publicacion-estado', args=[self.publicacion.id]), {'estado': codigo}, format='json',
        )

    def test_avisa_cada_cambio_de_estado_relevante(self):
        self.cambiar_estado('pausada')
        self.cambiar_estado('activa')
        self.cambiar_estado('reservada')
        self.cambiar_estado('alquilada')

        mensajes = self.mensajes_de(self.interesado)
        self.assertEqual(len(mensajes), 4)
        for mensaje, texto in zip(
            mensajes, ('fue pausada', 'está nuevamente disponible', 'fue reservada', 'fue marcada como alquilada'),
        ):
            self.assertIn(texto, mensaje)

    def test_solo_avisa_a_quienes_la_tienen_en_favoritos(self):
        self.cambiar_estado('pausada')

        self.assertEqual(self.mensajes_de(self.otro_interesado), [])
        self.assertEqual(self.mensajes_de(self.propietario), [])

    def test_no_avisa_si_el_estado_no_cambia(self):
        self.client.force_authenticate(self.propietario)

        self.client.patch(
            reverse('publicacion-detalle', args=[self.publicacion.id]), {'precio': '300000.00'}, format='multipart',
        )

        self.assertEqual(self.mensajes_de(self.interesado), [])

    def test_avisa_la_eliminacion_y_el_archivado(self):
        alquilada = crear_publicacion(
            self.propietario, estado='alquilada', ubicacion='Norte',
            alquilada_en=timezone.now() - timedelta(days=8),
        )
        Favorito.objects.create(usuario=self.interesado, publicacion=alquilada)

        call_command('archivar_publicaciones', stdout=StringIO())
        self.client.force_authenticate(self.propietario)
        self.client.delete(reverse('publicacion-detalle', args=[self.publicacion.id]))

        mensajes = self.mensajes_de(self.interesado)
        self.assertEqual(len(mensajes), 2)
        self.assertTrue(all('ya no está disponible' in mensaje for mensaje in mensajes))

    def test_no_avisa_la_revision_interna(self):
        publicacion = Publicacion.objects.get(id=self.publicacion.id)
        publicacion.estado = EstadoPublicacion.por_codigo('observada')
        publicacion.save(update_fields=['estado'])

        self.assertEqual(self.mensajes_de(self.interesado), [])


class AvisosDeModeracionTests(PruebaDeNotificaciones):
    def setUp(self):
        self.publicacion = crear_publicacion(self.propietario, estado='pendiente_moderacion')
        self.client.force_authenticate(self.administrador)

    def test_avisa_al_dueno_cada_decision(self):
        for accion, datos, texto in (
            ('solicitar-modificaciones', {'nota': 'Falta una foto.'}, 'solicitó modificaciones'),
            ('rechazar', {'nota': 'La factura no coincide.'}, 'fue rechazada. Motivo: La factura no coincide.'),
        ):
            with self.subTest(accion=accion):
                publicacion = crear_publicacion(self.propietario, estado='pendiente_moderacion', ubicacion=accion)

                self.client.post(reverse(f'publicacion-{accion}', args=[publicacion.id]), datos, format='json')

                self.assertIn(texto, self.mensajes_de(self.propietario)[-1])

        self.client.post(reverse('publicacion-aprobar', args=[self.publicacion.id]))
        self.assertEqual(self.mensajes_de(self.propietario)[-1], 'Tu publicación fue verificada y ya está activa.')


class AvisosDeCoincidenciasTests(PruebaDeNotificaciones):
    def crear_busqueda(self, nombre=None):
        return BusquedaActiva.objects.create(
            usuario=self.interesado, estado=EstadoBusqueda.por_codigo('activa'), nombre=nombre, amueblado=True,
        )

    def test_avisa_cuando_aparece_una_propiedad_compatible(self):
        self.crear_busqueda('Depto amueblado')

        crear_publicacion(self.propietario, amueblado=True)

        self.assertEqual(
            self.mensajes_de(self.interesado),
            ['Hay una nueva publicación compatible con tu búsqueda "Depto amueblado" (100% de compatibilidad).'],
        )

    def test_no_avisa_lo_que_ya_existia_al_guardar_la_busqueda(self):
        crear_publicacion(self.propietario, amueblado=True)
        self.client.force_authenticate(self.interesado)

        self.client.post(reverse('busqueda-lista'), {'amueblado': True}, format='json')

        self.assertEqual(self.mensajes_de(self.interesado), [])

    def test_no_repite_el_aviso_si_la_publicacion_vuelve_a_activarse(self):
        self.crear_busqueda()
        publicacion = crear_publicacion(self.propietario, amueblado=True)

        for codigo in ('pausada', 'activa'):
            publicacion = Publicacion.objects.get(id=publicacion.id)
            publicacion.estado = EstadoPublicacion.por_codigo(codigo)
            publicacion.save(update_fields=['estado'])

        self.assertEqual(len(self.mensajes_de(self.interesado)), 1)
