from collections import Counter
from decimal import Decimal

from django.db.models import Count
from django.utils import timezone
from rest_framework import serializers

from config.campos import CodigoDeCatalogo
from config.texto import normalizar_texto
from publicaciones.filtros import CARACTERISTICAS
from publicaciones.models import Publicacion, TipoInmueble

from .models import BusquedaActiva, Coincidencia

RANGOS_PRECIO = [
    ('Menos de $100.000', Decimal('0'), Decimal('100000')),
    ('$100.000 a $200.000', Decimal('100000'), Decimal('200000')),
    ('$200.000 a $300.000', Decimal('200000'), Decimal('300000')),
    ('Más de $300.000', Decimal('300000'), None),
]
ETIQUETAS_SEMANAS = ['Esta semana', 'La semana pasada', 'Hace 2 semanas', 'Hace 3 semanas']
MAXIMO_ZONAS = 8


class FiltrosDemandaSerializer(serializers.Serializer):
    desde = serializers.DateField(required=False)
    hasta = serializers.DateField(required=False)
    zona = serializers.CharField(required=False, allow_blank=True)
    tipo_inmueble = CodigoDeCatalogo(
        queryset=TipoInmueble.objects.all(), required=False, allow_null=True,
    )

    def validate(self, datos):
        if datos.get('desde') and datos.get('hasta') and datos['desde'] > datos['hasta']:
            raise serializers.ValidationError({'desde': ['No puede ser posterior a la fecha "hasta".']})
        return datos


def zona_de(ubicacion):
    zona = (ubicacion or '').split(',')[0].strip()
    return zona or None


def nombres_de_zonas(busquedas):
    # "Centro" y "centro" son la misma zona: se agrupan y se muestran con la primera forma escrita.
    nombres = {}
    for busqueda in sorted(busquedas, key=lambda b: b.id):
        zona = zona_de(busqueda.ubicacion)
        if zona:
            nombres.setdefault(normalizar_texto(zona), zona)
    return nombres


def precio_de_referencia(busqueda):
    valores = [valor for valor in (busqueda.precio_minimo, busqueda.precio_maximo) if valor is not None]
    return sum(valores) / len(valores) if valores else None


def _ranking(contador, limite=None):
    return [
        {'etiqueta': etiqueta, 'cantidad': cantidad}
        for etiqueta, cantidad in sorted(contador.items(), key=lambda par: (-par[1], par[0]))[:limite]
    ]


def calcular_demanda(anunciante, filtros):
    # RNF-07: solo se devuelven conteos agregados; nunca datos de quien busca.
    hoy = timezone.localdate()
    zona_pedida = normalizar_texto(filtros['zona']) if filtros.get('zona') else None
    tipo_pedido = filtros.get('tipo_inmueble')

    activas = list(BusquedaActiva.objects.filter(estado__codigo='activa').select_related('tipo_inmueble'))
    zonas = nombres_de_zonas(activas)

    def clave_de_zona(busqueda):
        zona = zona_de(busqueda.ubicacion)
        return normalizar_texto(zona) if zona else None

    def coincide_con_zona_y_tipo(busqueda):
        if zona_pedida and clave_de_zona(busqueda) != zona_pedida:
            return False
        return not tipo_pedido or busqueda.tipo_inmueble_id == tipo_pedido.id

    def dentro_del_periodo(busqueda):
        creada = timezone.localdate(busqueda.creado_en)
        return (not filtros.get('desde') or creada >= filtros['desde']) and (
            not filtros.get('hasta') or creada <= filtros['hasta']
        )

    por_zona_y_tipo = [b for b in activas if coincide_con_zona_y_tipo(b)]
    busquedas = [b for b in por_zona_y_tipo if dentro_del_periodo(b)]

    por_tipo = Counter(b.tipo_inmueble.nombre for b in busquedas if b.tipo_inmueble)
    por_zona = Counter(zonas[clave_de_zona(b)] for b in busquedas if clave_de_zona(b))

    por_rango = Counter()
    for busqueda in busquedas:
        precio = precio_de_referencia(busqueda)
        for etiqueta, minimo, maximo in RANGOS_PRECIO:
            if precio is not None and precio >= minimo and (maximo is None or precio < maximo):
                por_rango[etiqueta] += 1
    rangos = [{'etiqueta': etiqueta, 'cantidad': por_rango[etiqueta]} for etiqueta, _, _ in RANGOS_PRECIO]
    rango_mas_solicitado = max(rangos, key=lambda rango: rango['cantidad'])

    # La tendencia mira siempre las últimas 4 semanas, más allá del período elegido.
    por_semana = Counter((hoy - timezone.localdate(b.creado_en)).days // 7 for b in por_zona_y_tipo)
    tendencia = [
        {'etiqueta': ETIQUETAS_SEMANAS[semana], 'cantidad': por_semana[semana]}
        for semana in reversed(range(len(ETIQUETAS_SEMANAS)))
    ]

    propias = Publicacion.objects.filter(propietario=anunciante, estado__codigo='activa').order_by('id')
    usuarios_por_publicacion = dict(
        Coincidencia.objects.filter(publicacion__in=propias, busqueda__in=[b.id for b in busquedas])
        .values_list('publicacion_id')
        .annotate(usuarios=Count('busqueda__usuario', distinct=True)),
    )
    coincidencias = sorted(
        (
            {'publicacion': {'id': p.id, 'descripcion': p.descripcion}, 'usuarios': usuarios_por_publicacion.get(p.id, 0)}
            for p in propias
        ),
        key=lambda fila: -fila['usuarios'],
    )

    tipos = _ranking(por_tipo)
    return {
        'busquedas_activas': len(busquedas),
        'usuarios_buscando': len({b.usuario_id for b in busquedas}),
        'tipo_mas_buscado': tipos[0]['etiqueta'] if tipos else None,
        'rango_mas_solicitado': rango_mas_solicitado['etiqueta'] if rango_mas_solicitado['cantidad'] else None,
        'por_tipo': tipos,
        'por_rango_precio': rangos,
        'por_zona': _ranking(por_zona, MAXIMO_ZONAS),
        'caracteristicas': _ranking(
            Counter({c: sum(1 for b in busquedas if getattr(b, c)) for c in CARACTERISTICAS}),
        ),
        'tendencia_semanal': tendencia,
        'coincidencias_por_publicacion': coincidencias,
        'zonas_disponibles': sorted(zonas.values(), key=normalizar_texto),
    }
