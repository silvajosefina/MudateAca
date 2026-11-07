from datetime import timedelta
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from publicaciones.models import EstadoPublicacion, Modalidad, Publicacion, TipoInmueble
from publicaciones.tests import crear_publicacion, crear_usuario

from .coincidencias import calcular_compatibilidad
from .models import BusquedaActiva, Coincidencia, EstadoBusqueda


class PruebaDeBusquedas(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.interesado = crear_usuario('interesado@mudateaca.com', rol='interesado')
        cls.otro_interesado = crear_usuario('otro.interesado@mudateaca.com', rol='interesado')
        cls.propietario = crear_usuario('propietario@mudateaca.com')
        cls.administrador = crear_usuario('admin@mudateaca.com', rol='administrador')

    def setUp(self):
        self.client.force_authenticate(self.interesado)

    def crear(self, **datos):
        return self.client.post(reverse('busqueda-lista'), datos, format='json')

    def crear_busqueda(self, usuario=None, estado='activa', modalidad=None, tipo_inmueble=None, **campos):
        return BusquedaActiva.objects.create(
            usuario=usuario or self.interesado,
            estado=EstadoBusqueda.por_codigo(estado),
            modalidad=Modalidad.por_codigo(modalidad) if modalidad else None,
            tipo_inmueble=TipoInmueble.por_codigo(tipo_inmueble) if tipo_inmueble else None,
            **campos,
        )

    def cambiar_estado_de(self, publicacion, codigo):
        publicacion = Publicacion.objects.get(id=publicacion.id)
        publicacion.estado = EstadoPublicacion.por_codigo(codigo)
        publicacion.save(update_fields=['estado', 'actualizado_en'])

    def coincidencias(self, busqueda_id):
        return self.client.get(reverse('busqueda-coincidencias', args=[busqueda_id])).data


class CompatibilidadTests(PruebaDeBusquedas):
    def nivel(self, busqueda, publicacion):
        return calcular_compatibilidad(busqueda, Publicacion.objects.get(id=publicacion.id))

    def test_un_precio_fuera_de_rango_no_cumple_por_estar_de_un_solo_lado(self):
        # Caso real del mock: casa de 220.000 a 350.000 frente a un monoambiente de 110.000.
        busqueda = self.crear_busqueda(
            modalidad='residencial', tipo_inmueble='casa',
            precio_minimo=Decimal('220000'), precio_maximo=Decimal('350000'),
        )
        monoambiente = crear_publicacion(self.propietario, precio='110000.00', ambientes=1, dormitorios=0)

        self.assertEqual(self.nivel(busqueda, monoambiente), 0)

    def test_el_rango_de_precio_es_un_solo_criterio(self):
        busqueda = self.crear_busqueda(precio_minimo=Decimal('100000'), precio_maximo=Decimal('200000'))

        barata = crear_publicacion(self.propietario, precio='50000.00', ubicacion='A')
        cara = crear_publicacion(self.propietario, precio='900000.00', ubicacion='B')
        justa = crear_publicacion(self.propietario, precio='150000.00', ubicacion='C')

        self.assertEqual(self.nivel(busqueda, barata), 0)
        self.assertEqual(self.nivel(busqueda, cara), 0)
        self.assertEqual(self.nivel(busqueda, justa), 100)

    def test_modalidad_y_tipo_son_excluyentes(self):
        publicacion = crear_publicacion(self.propietario, precio='100000.00')

        otro_tipo = self.crear_busqueda(tipo_inmueble='casa', precio_maximo=Decimal('200000'))
        otra_modalidad = self.crear_busqueda(modalidad='temporario', precio_maximo=Decimal('200000'))

        self.assertEqual(self.nivel(otro_tipo, publicacion), 0)
        self.assertEqual(self.nivel(otra_modalidad, publicacion), 0)

    def test_modalidad_y_tipo_no_suman_al_porcentaje(self):
        busqueda = self.crear_busqueda(
            modalidad='residencial', tipo_inmueble='departamento', precio_maximo=Decimal('100'),
        )

        self.assertEqual(self.nivel(busqueda, crear_publicacion(self.propietario, precio='5000.00')), 0)

    def test_sin_mas_criterios_una_candidata_es_totalmente_compatible(self):
        busqueda = self.crear_busqueda(tipo_inmueble='departamento')

        self.assertEqual(self.nivel(busqueda, crear_publicacion(self.propietario)), 100)

    def test_calcula_la_proporcion_de_criterios_cumplidos(self):
        busqueda = self.crear_busqueda(
            precio_maximo=Decimal('300000'), ambientes_minimos=2, acepta_mascotas=True,
        )

        publicacion = crear_publicacion(self.propietario, ambientes=3)

        self.assertEqual(self.nivel(busqueda, publicacion), 67)

    def test_la_ubicacion_ignora_acentos_y_mayusculas(self):
        busqueda = self.crear_busqueda(ubicacion='LAUQUEN')

        publicacion = crear_publicacion(self.propietario, ubicacion='Centro, Trenque Lauquén')

        self.assertEqual(self.nivel(busqueda, publicacion), 100)

    def test_evalua_la_estadia_solo_en_temporarios(self):
        busqueda = self.crear_busqueda(
            fecha_ingreso='2026-12-05', fecha_salida='2026-12-08', amueblado=True,
        )
        busqueda.refresh_from_db()
        temporario = crear_publicacion(
            self.propietario, modalidad='temporario', amueblado=True, duracion_minima_dias=7,
            disponible_desde='2026-12-01', ubicacion='T',
        )
        residencial = crear_publicacion(self.propietario, amueblado=True, ubicacion='R')

        self.assertEqual(self.nivel(busqueda, temporario), 50)
        self.assertEqual(self.nivel(busqueda, residencial), 100)


class BusquedaActivaTests(PruebaDeBusquedas):
    def test_crea_una_busqueda_activa_del_usuario(self):
        respuesta = self.crear(nombre='Depto céntrico', tipo_inmueble='departamento', precio_maximo='200000')

        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.data['estado'], 'activa')
        self.assertEqual(respuesta.data['tipo_inmueble'], 'departamento')
        self.assertEqual(BusquedaActiva.objects.get().usuario, self.interesado)

    def test_solo_los_interesados_tienen_busquedas(self):
        for usuario, codigo in ((self.propietario, 403), (self.administrador, 403), (None, 401)):
            with self.subTest(usuario=usuario):
                self.client.force_authenticate(usuario)

                self.assertEqual(self.crear(amueblado=True).status_code, codigo)
                self.assertEqual(self.client.get(reverse('busqueda-lista')).status_code, codigo)

    def test_exige_al_menos_un_criterio(self):
        for datos in ({}, {'nombre': 'Solo nombre'}, {'precio_minimo': 0, 'amueblado': False, 'ubicacion': ''}):
            with self.subTest(datos=datos):
                self.assertEqual(self.crear(**datos).status_code, 400)

    def test_cero_vacio_y_falso_significan_sin_preferencia(self):
        respuesta = self.crear(
            nombre='', precio_minimo=0, ambientes_minimos=0, amueblado=False, ubicacion='', acepta_mascotas=True,
        )

        self.assertEqual(respuesta.status_code, 201)
        busqueda = BusquedaActiva.objects.get()
        self.assertIsNone(busqueda.nombre)
        self.assertIsNone(busqueda.precio_minimo)
        self.assertIsNone(busqueda.ambientes_minimos)
        self.assertIsNone(busqueda.amueblado)
        self.assertIsNone(busqueda.ubicacion)
        self.assertTrue(busqueda.acepta_mascotas)

    def test_rechaza_rangos_invalidos(self):
        self.assertEqual(self.crear(precio_minimo='300', precio_maximo='200').status_code, 400)
        self.assertEqual(self.crear(precio_minimo='-1').status_code, 400)
        self.assertEqual(self.crear(fecha_ingreso='2026-12-10', fecha_salida='2026-12-01').status_code, 400)

    def test_rechaza_una_busqueda_duplicada_del_mismo_usuario(self):
        self.crear(nombre='Primera', ubicacion='Centro', precio_maximo='200000')

        respuesta = self.crear(nombre='Segunda', ubicacion='CENTRO', precio_maximo='200000.00')

        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(BusquedaActiva.objects.count(), 1)

    def test_otro_usuario_puede_tener_la_misma_busqueda(self):
        self.crear(ubicacion='Centro')
        self.client.force_authenticate(self.otro_interesado)

        self.assertEqual(self.crear(ubicacion='Centro').status_code, 201)

    def test_una_busqueda_residencial_descarta_las_fechas(self):
        self.crear(modalidad='residencial', fecha_ingreso='2026-12-01', fecha_salida='2026-12-10')

        busqueda = BusquedaActiva.objects.get()
        self.assertIsNone(busqueda.fecha_ingreso)
        self.assertIsNone(busqueda.fecha_salida)

    def test_lista_solo_las_propias(self):
        propia = self.crear_busqueda(amueblado=True)
        self.crear_busqueda(usuario=self.otro_interesado, amueblado=True)

        respuesta = self.client.get(reverse('busqueda-lista'))

        self.assertEqual([busqueda['id'] for busqueda in respuesta.data], [propia.id])

    def test_edita_una_busqueda_propia(self):
        busqueda = self.crear_busqueda(ubicacion='Centro')

        respuesta = self.client.patch(
            reverse('busqueda-detalle', args=[busqueda.id]), {'nombre': 'Nueva'}, format='json',
        )

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['nombre'], 'Nueva')
        self.assertEqual(respuesta.data['ubicacion'], 'Centro')

    def test_editar_sin_cambios_no_se_detecta_como_duplicada(self):
        busqueda = self.crear_busqueda(ubicacion='Centro')

        respuesta = self.client.patch(
            reverse('busqueda-detalle', args=[busqueda.id]), {'ubicacion': 'Centro'}, format='json',
        )

        self.assertEqual(respuesta.status_code, 200)

    def test_no_permite_vaciar_todos_los_criterios_al_editar(self):
        busqueda = self.crear_busqueda(ubicacion='Centro')

        respuesta = self.client.patch(
            reverse('busqueda-detalle', args=[busqueda.id]), {'ubicacion': ''}, format='json',
        )

        self.assertEqual(respuesta.status_code, 400)

    def test_no_permite_acceder_a_busquedas_ajenas(self):
        ajena = self.crear_busqueda(usuario=self.otro_interesado, ubicacion='Centro')
        url = reverse('busqueda-detalle', args=[ajena.id])

        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.patch(url, {'nombre': 'X'}, format='json').status_code, 404)
        self.assertEqual(self.client.delete(url).status_code, 404)
        self.assertEqual(
            self.client.post(reverse('busqueda-estado', args=[ajena.id]), {'estado': 'pausada'}).status_code, 404,
        )
        self.assertEqual(self.client.get(reverse('busqueda-coincidencias', args=[ajena.id])).status_code, 404)
        self.assertTrue(BusquedaActiva.objects.filter(id=ajena.id).exists())

    def test_eliminar_es_logico_y_la_oculta(self):
        crear_publicacion(self.propietario)
        busqueda_id = self.crear(tipo_inmueble='departamento').data['id']

        respuesta = self.client.delete(reverse('busqueda-detalle', args=[busqueda_id]))

        self.assertEqual(respuesta.status_code, 204)
        self.assertIsNotNone(BusquedaActiva.todos.get(id=busqueda_id).eliminado_en)
        self.assertEqual(Coincidencia.todos.filter(busqueda_id=busqueda_id).count(), 1)
        self.assertEqual(self.client.get(reverse('busqueda-lista')).data, [])
        self.assertEqual(self.client.get(reverse('busqueda-detalle', args=[busqueda_id])).status_code, 404)
        self.assertEqual(self.client.delete(reverse('busqueda-detalle', args=[busqueda_id])).status_code, 404)

    def test_una_busqueda_eliminada_no_genera_coincidencias_ni_cuenta_como_duplicada(self):
        busqueda_id = self.crear(tipo_inmueble='departamento').data['id']
        self.client.delete(reverse('busqueda-detalle', args=[busqueda_id]))

        crear_publicacion(self.propietario)

        self.assertFalse(Coincidencia.todos.exists())
        self.assertEqual(self.crear(tipo_inmueble='departamento').status_code, 201)

    def test_el_mensaje_de_busqueda_inexistente_esta_en_espanol(self):
        respuesta = self.client.get(reverse('busqueda-detalle', args=[999999]))

        self.assertEqual(respuesta.status_code, 404)
        self.assertEqual(respuesta.data['detail'], 'No se encontró el recurso solicitado.')

    def test_pausa_y_reactiva(self):
        busqueda = self.crear_busqueda(ubicacion='Centro')
        url = reverse('busqueda-estado', args=[busqueda.id])

        self.assertEqual(self.client.post(url, {'estado': 'pausada'}, format='json').data['estado'], 'pausada')
        self.assertEqual(self.client.post(url, {'estado': 'activa'}, format='json').data['estado'], 'activa')

    def test_rechaza_cambios_de_estado_invalidos(self):
        busqueda = self.crear_busqueda(ubicacion='Centro')
        url = reverse('busqueda-estado', args=[busqueda.id])

        self.assertEqual(self.client.post(url, {'estado': 'activa'}, format='json').status_code, 400)
        self.assertEqual(self.client.post(url, {'estado': 'inventado'}, format='json').status_code, 400)


class GeneracionDeCoincidenciasTests(PruebaDeBusquedas):
    def test_crear_una_busqueda_compara_con_las_publicaciones_activas(self):
        compatible = crear_publicacion(self.propietario)
        crear_publicacion(self.propietario, tipo_inmueble='casa', ubicacion='Norte')
        crear_publicacion(self.propietario, estado='pausada', ubicacion='Sur')

        respuesta = self.crear(tipo_inmueble='departamento')

        self.assertEqual(respuesta.data['cantidad_coincidencias'], 1)
        coincidencia = self.coincidencias(respuesta.data['id'])[0]
        self.assertEqual(coincidencia['publicacion']['id'], compatible.id)
        self.assertEqual(coincidencia['nivel_compatibilidad'], 100)

    def test_ordena_por_compatibilidad(self):
        media = crear_publicacion(self.propietario, ubicacion='A', ambientes=1)
        alta = crear_publicacion(self.propietario, ubicacion='B', ambientes=3)

        id_busqueda = self.crear(precio_maximo='300000', ambientes_minimos=2).data['id']

        self.assertEqual(
            [c['publicacion']['id'] for c in self.coincidencias(id_busqueda)], [alta.id, media.id],
        )

    def test_no_guarda_compatibilidades_menores_al_minimo(self):
        crear_publicacion(self.propietario, ambientes=1)

        self.crear(precio_maximo='100', ambientes_minimos=2, amueblado=True)

        self.assertFalse(Coincidencia.objects.exists())

    def test_una_publicacion_aprobada_genera_coincidencias(self):
        busqueda = self.crear_busqueda(tipo_inmueble='departamento')
        publicacion = crear_publicacion(self.propietario, estado='pendiente_moderacion')
        self.assertFalse(Coincidencia.objects.exists())

        self.client.force_authenticate(self.administrador)
        self.client.post(reverse('publicacion-aprobar', args=[publicacion.id]))

        coincidencia = Coincidencia.objects.get()
        self.assertEqual(coincidencia.busqueda, busqueda)
        self.assertEqual(coincidencia.publicacion, publicacion)
        self.assertTrue(coincidencia.notificada)
        self.assertEqual(self.interesado.notificaciones.count(), 1)

    def test_no_coincide_con_busquedas_pausadas(self):
        self.crear_busqueda(estado='pausada', tipo_inmueble='departamento')

        crear_publicacion(self.propietario)

        self.assertFalse(Coincidencia.objects.exists())

    def test_reactivar_una_busqueda_trae_lo_publicado_mientras_estuvo_pausada(self):
        busqueda = self.crear_busqueda(estado='pausada', tipo_inmueble='departamento')
        crear_publicacion(self.propietario)

        self.client.post(reverse('busqueda-estado', args=[busqueda.id]), {'estado': 'activa'}, format='json')

        self.assertEqual(Coincidencia.objects.filter(busqueda=busqueda).count(), 1)

    def test_editar_una_busqueda_recalcula_sus_coincidencias(self):
        crear_publicacion(self.propietario)
        id_busqueda = self.crear(tipo_inmueble='departamento').data['id']

        self.client.patch(reverse('busqueda-detalle', args=[id_busqueda]), {'tipo_inmueble': 'casa'}, format='json')

        self.assertFalse(Coincidencia.objects.exists())

    def test_editar_una_publicacion_recalcula_sus_coincidencias(self):
        publicacion = crear_publicacion(self.propietario, precio='100000.00')
        self.crear(precio_maximo='200000')
        self.assertEqual(Coincidencia.objects.count(), 1)

        self.client.force_authenticate(self.propietario)
        self.client.patch(
            reverse('publicacion-detalle', args=[publicacion.id]), {'precio': '500000.00'}, format='multipart',
        )

        self.assertFalse(Coincidencia.objects.exists())

    def test_oculta_publicaciones_que_dejaron_de_estar_activas(self):
        publicacion = crear_publicacion(self.propietario)
        id_busqueda = self.crear(tipo_inmueble='departamento').data['id']

        self.cambiar_estado_de(publicacion, 'pausada')

        self.assertEqual(self.coincidencias(id_busqueda), [])
        self.assertEqual(
            self.client.get(reverse('busqueda-detalle', args=[id_busqueda])).data['cantidad_coincidencias'], 0,
        )

    def test_una_coincidencia_que_deja_de_cumplir_se_oculta_y_se_recupera(self):
        self.crear_busqueda(precio_maximo=Decimal('200000'))
        publicacion = crear_publicacion(self.propietario, precio='100000.00')
        self.assertEqual(self.interesado.notificaciones.count(), 1)
        self.client.force_authenticate(self.propietario)
        url = reverse('publicacion-detalle', args=[publicacion.id])

        self.client.patch(url, {'precio': '500000.00'}, format='multipart')
        self.assertFalse(Coincidencia.objects.exists())
        self.assertIsNotNone(Coincidencia.todos.get().eliminado_en)

        self.client.patch(url, {'precio': '150000.00'}, format='multipart')
        self.assertIsNone(Coincidencia.todos.get().eliminado_en)
        self.assertEqual(self.interesado.notificaciones.count(), 1)

    def test_una_publicacion_reactivada_no_pierde_la_marca_de_notificada(self):
        publicacion = crear_publicacion(self.propietario)
        self.crear(tipo_inmueble='departamento')
        Coincidencia.objects.update(notificada=True)

        self.cambiar_estado_de(publicacion, 'pausada')
        self.cambiar_estado_de(publicacion, 'activa')

        self.assertTrue(Coincidencia.objects.get().notificada)

    def test_no_expone_datos_privados_del_anunciante(self):
        crear_publicacion(self.propietario)
        id_busqueda = self.crear(tipo_inmueble='departamento').data['id']

        contenido = self.client.get(reverse('busqueda-coincidencias', args=[id_busqueda])).content.decode()

        self.assertNotIn(self.propietario.correo, contenido)
        self.assertNotIn('archivo_verificacion', contenido)


class PanelDemandaTests(PruebaDeBusquedas):
    def setUp(self):
        self.client.force_authenticate(self.propietario)

    def panel(self, **filtros):
        respuesta = self.client.get(reverse('panel-demanda'), filtros)
        self.assertEqual(respuesta.status_code, 200)
        return respuesta.data

    def con_fecha(self, busqueda, dias_atras):
        BusquedaActiva.objects.filter(id=busqueda.id).update(creado_en=timezone.now() - timedelta(days=dias_atras))

    def test_agrega_la_demanda_sin_datos_personales(self):
        self.crear_busqueda(tipo_inmueble='casa', precio_maximo=Decimal('150000'), ubicacion='Centro, Trenque')
        self.crear_busqueda(tipo_inmueble='casa', acepta_mascotas=True, ubicacion='centro')
        self.crear_busqueda(usuario=self.otro_interesado, tipo_inmueble='departamento', ubicacion='Norte')
        self.crear_busqueda(estado='pausada', tipo_inmueble='habitacion')

        datos = self.panel()

        self.assertEqual(datos['busquedas_activas'], 3)
        self.assertEqual(datos['usuarios_buscando'], 2)
        self.assertEqual(datos['tipo_mas_buscado'], 'Casa')
        self.assertEqual(
            datos['por_tipo'], [{'etiqueta': 'Casa', 'cantidad': 2}, {'etiqueta': 'Departamento', 'cantidad': 1}],
        )
        self.assertIn({'etiqueta': 'acepta_mascotas', 'cantidad': 1}, datos['caracteristicas'])
        contenido = self.client.get(reverse('panel-demanda')).content.decode()
        for dato_privado in (self.interesado.correo, self.interesado.apellido, self.interesado.celular, 'usuario_id'):
            self.assertNotIn(dato_privado, contenido)

    def test_agrupa_zonas_escritas_de_distinta_forma(self):
        self.crear_busqueda(ubicacion='Centro, Trenque Lauquen')
        self.crear_busqueda(ubicacion='centro')
        self.crear_busqueda(ubicacion='CÉNTRO')
        self.crear_busqueda(ubicacion='Norte')

        datos = self.panel()

        self.assertEqual(datos['por_zona'], [{'etiqueta': 'Centro', 'cantidad': 3}, {'etiqueta': 'Norte', 'cantidad': 1}])
        self.assertEqual(datos['zonas_disponibles'], ['Centro', 'Norte'])
        self.assertEqual(self.panel(zona='centro')['busquedas_activas'], 3)

    def test_agrupa_por_rango_de_precio(self):
        self.crear_busqueda(precio_minimo=Decimal('100000'), precio_maximo=Decimal('200000'))
        self.crear_busqueda(precio_maximo=Decimal('50000'))
        self.crear_busqueda(precio_minimo=Decimal('400000'))
        self.crear_busqueda(amueblado=True)

        datos = self.panel()

        self.assertEqual([rango['cantidad'] for rango in datos['por_rango_precio']], [1, 1, 0, 1])
        self.assertEqual(datos['rango_mas_solicitado'], 'Menos de $100.000')

    def test_filtra_por_zona_tipo_y_periodo(self):
        vieja = self.crear_busqueda(tipo_inmueble='casa', ubicacion='Centro')
        self.con_fecha(vieja, 40)
        self.crear_busqueda(tipo_inmueble='casa', ubicacion='Norte', amueblado=True)
        self.crear_busqueda(tipo_inmueble='departamento', ubicacion='Centro', amueblado=True)
        hace_un_mes = (timezone.localdate() - timedelta(days=30)).isoformat()

        self.assertEqual(self.panel(zona='CENTRO')['busquedas_activas'], 2)
        self.assertEqual(self.panel(tipo_inmueble='casa')['busquedas_activas'], 2)
        self.assertEqual(self.panel(desde=hace_un_mes)['busquedas_activas'], 2)
        self.assertEqual(self.panel(zona='Centro', tipo_inmueble='casa', desde=hace_un_mes)['busquedas_activas'], 0)
        self.assertEqual(self.panel()['zonas_disponibles'], ['Centro', 'Norte'])

    def test_la_tendencia_ordena_las_ultimas_cuatro_semanas(self):
        for dias in (0, 2, 8, 20, 60):
            self.con_fecha(self.crear_busqueda(ambientes_minimos=dias + 1), dias)

        tendencia = self.panel(desde=timezone.localdate().isoformat())['tendencia_semanal']

        self.assertEqual(
            tendencia,
            [
                {'etiqueta': 'Hace 3 semanas', 'cantidad': 0},
                {'etiqueta': 'Hace 2 semanas', 'cantidad': 1},
                {'etiqueta': 'La semana pasada', 'cantidad': 1},
                {'etiqueta': 'Esta semana', 'cantidad': 2},
            ],
        )

    def test_cuenta_usuarios_compatibles_con_cada_publicacion_propia(self):
        self.crear_busqueda(tipo_inmueble='departamento')
        self.crear_busqueda(tipo_inmueble='departamento', amueblado=True)
        self.crear_busqueda(usuario=self.otro_interesado, tipo_inmueble='departamento')
        propia = crear_publicacion(self.propietario)
        crear_publicacion(self.propietario, estado='pausada', ubicacion='Pausada')
        crear_publicacion(crear_usuario('ajeno@mudateaca.com'), ubicacion='Ajena')

        coincidencias = self.panel()['coincidencias_por_publicacion']

        self.assertEqual(
            coincidencias, [{'publicacion': {'id': propia.id, 'descripcion': propia.descripcion}, 'usuarios': 2}],
        )

    def test_rechaza_filtros_invalidos(self):
        for filtros in (
            {'desde': 'ayer'}, {'tipo_inmueble': 'inventado'}, {'desde': '2026-12-10', 'hasta': '2026-12-01'},
        ):
            with self.subTest(filtros=filtros):
                self.assertEqual(self.client.get(reverse('panel-demanda'), filtros).status_code, 400)

    def test_solo_propietarios_e_inmobiliarias_ven_la_demanda(self):
        for usuario, codigo in ((self.interesado, 403), (self.administrador, 403), (None, 401)):
            with self.subTest(usuario=usuario):
                self.client.force_authenticate(usuario)

                self.assertEqual(self.client.get(reverse('panel-demanda')).status_code, codigo)
