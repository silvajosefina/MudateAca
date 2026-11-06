from config.texto import normalizar_texto
from notificaciones.servicios import notificar
from publicaciones.filtros import CARACTERISTICAS, cubre_estadia
from publicaciones.models import Publicacion

from .models import BusquedaActiva, Coincidencia

MINIMO_COMPATIBILIDAD = 50


def _criterios(busqueda, publicacion):
    criterios = []

    if busqueda.precio_minimo is not None or busqueda.precio_maximo is not None:
        # Mínimo y máximo son un solo criterio: casi todo precio cumple al menos uno de los dos.
        criterios.append(
            (busqueda.precio_minimo is None or publicacion.precio >= busqueda.precio_minimo)
            and (busqueda.precio_maximo is None or publicacion.precio <= busqueda.precio_maximo),
        )
    if busqueda.ambientes_minimos:
        criterios.append(publicacion.ambientes >= busqueda.ambientes_minimos)
    if busqueda.dormitorios_minimos:
        criterios.append(publicacion.dormitorios >= busqueda.dormitorios_minimos)
    if busqueda.ubicacion:
        criterios.append(normalizar_texto(busqueda.ubicacion) in normalizar_texto(publicacion.ubicacion))
    for caracteristica in CARACTERISTICAS:
        if getattr(busqueda, caracteristica):
            criterios.append(getattr(publicacion, caracteristica))

    pide_fechas = busqueda.fecha_ingreso or busqueda.fecha_salida or busqueda.duracion_estadia_dias
    if pide_fechas and publicacion.modalidad.codigo == 'temporario':
        criterios.append(
            cubre_estadia(publicacion, busqueda.fecha_ingreso, busqueda.fecha_salida, busqueda.duracion_estadia_dias),
        )

    return criterios


def calcular_compatibilidad(busqueda, publicacion):
    # Modalidad y tipo son excluyentes: filtran candidatas y no suman al porcentaje.
    if busqueda.modalidad_id and busqueda.modalidad_id != publicacion.modalidad_id:
        return 0
    if busqueda.tipo_inmueble_id and busqueda.tipo_inmueble_id != publicacion.tipo_inmueble_id:
        return 0

    criterios = _criterios(busqueda, publicacion)
    if not criterios:
        return 100
    return round(100 * sum(criterios) / len(criterios))


def _avisar_coincidencia(coincidencia):
    nombre = coincidencia.busqueda.nombre or 'Búsqueda sin nombre'
    notificar(
        [coincidencia.busqueda.usuario],
        f'Hay una nueva publicación compatible con tu búsqueda "{nombre}" '
        f'({coincidencia.nivel_compatibilidad}% de compatibilidad).',
        referencia=coincidencia.publicacion,
    )


def _actualizar_coincidencia(busqueda, publicacion, avisar):
    nivel = calcular_compatibilidad(busqueda, publicacion)
    if nivel < MINIMO_COMPATIBILIDAD:
        Coincidencia.objects.filter(busqueda=busqueda, publicacion=publicacion).delete()
        return

    # RF-13: solo se avisa por propiedades nuevas; lo que ya existía al guardar la búsqueda se da por visto.
    coincidencia, creada = Coincidencia.objects.update_or_create(
        busqueda=busqueda,
        publicacion=publicacion,
        defaults={'nivel_compatibilidad': nivel},
        create_defaults={'nivel_compatibilidad': nivel, 'notificada': not avisar},
    )
    if creada and avisar:
        _avisar_coincidencia(coincidencia)
        coincidencia.notificada = True
        coincidencia.save(update_fields=['notificada'])


def recalcular_por_busqueda(busqueda):
    for publicacion in Publicacion.objects.filter(estado__codigo='activa').select_related('modalidad'):
        _actualizar_coincidencia(busqueda, publicacion, avisar=False)


def recalcular_por_publicacion(publicacion_id):
    # Se relee para comparar valores ya tipados por la base, no los que llegaron en la instancia.
    publicacion = Publicacion.objects.select_related('modalidad').get(id=publicacion_id)
    for busqueda in BusquedaActiva.objects.filter(estado__codigo='activa').select_related('usuario'):
        _actualizar_coincidencia(busqueda, publicacion, avisar=True)
