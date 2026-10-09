import { useState } from 'react'
import { BarChart3, CalendarRange, Download, Home, ListChecks, MapPin, SlidersHorizontal, TrendingUp, Users } from 'lucide-react'
import PanelLayout from '../layouts/PanelLayout'
import GraficoBarras from '../components/GraficoBarras'
import GraficoTendencia from '../components/GraficoTendencia'
import { calcularCompatibilidad, obtenerTodasLasBusquedasActivas } from '../mocks/busquedasActivas'
import { obtenerPublicacionesDeUsuario } from '../mocks/publicaciones'
import { obtenerSesion } from '../mocks/sesion'
import { generarReporteDemandaPDF } from '../utils/pdf'
import { ETIQUETAS_TIPO_INMUEBLE, type TipoInmueble } from '../types/publicacion'
import type { BusquedaActiva } from '../types/busqueda'
import type { Publicacion } from '../types/publicacion'

const RANGOS_PRECIO = [
    { etiqueta: 'Menos de $100.000', min: 0, max: 100000 },
    { etiqueta: '$100.000 a $200.000', min: 100000, max: 200000 },
    { etiqueta: '$200.000 a $300.000', min: 200000, max: 300000 },
    { etiqueta: 'Más de $300.000', min: 300000, max: Infinity },
]

const SEMANAS = ['Hace 4 semanas', 'Hace 3 semanas', 'Hace 2 semanas', 'Esta semana']

const MAX_ZONAS_MOSTRADAS = 8

type PeriodoPreset = 'todos' | '30d' | '3m' | '1a' | 'personalizado'

const OPCIONES_PERIODO: { valor: PeriodoPreset; etiqueta: string }[] = [
    { valor: 'todos', etiqueta: 'Todo el historial' },
    { valor: '30d', etiqueta: 'Últimos 30 días' },
    { valor: '3m', etiqueta: 'Últimos 3 meses' },
    { valor: '1a', etiqueta: 'Último año' },
    { valor: 'personalizado', etiqueta: 'Rango personalizado' },
]

function usuariosCompatibles(publicacion: Publicacion, busquedas: BusquedaActiva[]): number {
    const usuarios = new Set(
        busquedas.filter((b) => calcularCompatibilidad(b, publicacion) >= 50).map((b) => b.usuarioId),
    )
    return usuarios.size
}

function precioPromedio(busqueda: BusquedaActiva): number | null {
    const valores = [busqueda.precioMin, busqueda.precioMax].filter((v) => v > 0)
    if (valores.length === 0) return null
    return valores.reduce((a, b) => a + b, 0) / valores.length
}

function semanaDesdeCreacion(creadaEn: string): number {
    const dias = Math.floor((Date.now() - new Date(creadaEn).getTime()) / 86400000)
    return Math.min(3, Math.max(0, Math.floor(dias / 7)))
}

function barrioDesdeUbicacion(ubicacion: string): string {
    const primerSegmento = ubicacion.split(',')[0]?.trim()
    return primerSegmento || 'Sin especificar'
}

function limitesPeriodo(
    periodo: PeriodoPreset,
    fechaDesde: string,
    fechaHasta: string,
): { desde: Date | null; hasta: Date | null } {
    const ahora = new Date()
    switch (periodo) {
        case '30d':
            return { desde: new Date(ahora.getTime() - 30 * 86400000), hasta: null }
        case '3m': {
            const desde = new Date(ahora)
            desde.setMonth(desde.getMonth() - 3)
            return { desde, hasta: null }
        }
        case '1a': {
            const desde = new Date(ahora)
            desde.setFullYear(desde.getFullYear() - 1)
            return { desde, hasta: null }
        }
        case 'personalizado':
            return {
                desde: fechaDesde ? new Date(fechaDesde) : null,
                hasta: fechaHasta ? new Date(fechaHasta) : null,
            }
        default:
            return { desde: null, hasta: null }
    }
}

function PanelDemanda() {
    const sesion = obtenerSesion()
    const [periodo, setPeriodo] = useState<PeriodoPreset>('todos')
    const [fechaDesde, setFechaDesde] = useState('')
    const [fechaHasta, setFechaHasta] = useState('')
    const [zonaFiltro, setZonaFiltro] = useState('todas')
    const [tipoFiltro, setTipoFiltro] = useState<TipoInmueble | 'todos'>('todos')

    if (!sesion) return null

    const todasLasBusquedas = obtenerTodasLasBusquedasActivas()
    const misPublicaciones = obtenerPublicacionesDeUsuario(sesion.id).filter((p) => p.estado === 'activa')

    const barriosDisponibles = Array.from(
        new Set(
            todasLasBusquedas
                .filter((b) => b.ubicacion.trim())
                .map((b) => barrioDesdeUbicacion(b.ubicacion)),
        ),
    ).sort((a, b) => a.localeCompare(b))

    function coincideConZonaYTipo(b: BusquedaActiva): boolean {
        if (zonaFiltro !== 'todas' && barrioDesdeUbicacion(b.ubicacion) !== zonaFiltro) return false
        if (tipoFiltro !== 'todos' && b.tipoInmueble !== tipoFiltro) return false
        return true
    }

    const { desde, hasta } = limitesPeriodo(periodo, fechaDesde, fechaHasta)
    const busquedas = todasLasBusquedas.filter((b) => {
        if (!coincideConZonaYTipo(b)) return false
        const creada = new Date(b.creadaEn)
        if (desde && creada < desde) return false
        if (hasta) {
            const hastaFin = new Date(hasta)
            hastaFin.setHours(23, 59, 59, 999)
            if (creada > hastaFin) return false
        }
        return true
    })

    const conteoTipos: Partial<Record<TipoInmueble, number>> = {}
    busquedas.forEach((b) => {
        if (b.tipoInmueble !== 'todos') conteoTipos[b.tipoInmueble] = (conteoTipos[b.tipoInmueble] ?? 0) + 1
    })
    const datosTipos = (Object.entries(conteoTipos) as [TipoInmueble, number][])
        .map(([tipo, cantidad]) => ({ etiqueta: ETIQUETAS_TIPO_INMUEBLE[tipo], valor: cantidad }))
        .sort((a, b) => b.valor - a.valor)
    const tipoMasBuscado = datosTipos[0]?.etiqueta

    const datosPrecios = RANGOS_PRECIO.map((rango) => ({
        etiqueta: rango.etiqueta,
        valor: busquedas.filter((b) => {
            const promedio = precioPromedio(b)
            return promedio !== null && promedio >= rango.min && promedio < rango.max
        }).length,
    }))
    const rangoMasSolicitado = [...datosPrecios].sort((a, b) => b.valor - a.valor)[0]

    const conteoZonas: Record<string, number> = {}
    busquedas.forEach((b) => {
        if (!b.ubicacion.trim()) return
        const barrio = barrioDesdeUbicacion(b.ubicacion)
        conteoZonas[barrio] = (conteoZonas[barrio] ?? 0) + 1
    })
    const datosZonas = Object.entries(conteoZonas)
        .map(([etiqueta, valor]) => ({ etiqueta, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, MAX_ZONAS_MOSTRADAS)

    const caracteristicas = [
        { etiqueta: 'Acepta mascotas', valor: busquedas.filter((b) => b.aceptaMascotas).length },
        { etiqueta: 'Amueblado', valor: busquedas.filter((b) => b.amueblado).length },
        { etiqueta: 'Apto estudiantes', valor: busquedas.filter((b) => b.aptoEstudiantes).length },
        { etiqueta: 'Servicios incluidos', valor: busquedas.filter((b) => b.serviciosIncluidos).length },
    ].sort((a, b) => b.valor - a.valor)

    // La tendencia semanal se mantiene siempre sobre las últimas 4 semanas: el
    // selector de período no la afecta (52 barras semanales para "último año"
    // dejarían de ser legibles). Sí respeta los filtros de zona y tipo.
    const busquedasParaTendencia = todasLasBusquedas.filter(coincideConZonaYTipo)
    const tendencia = SEMANAS.map((etiqueta, indice) => ({
        etiqueta,
        valor: busquedasParaTendencia.filter((b) => semanaDesdeCreacion(b.creadaEn) === indice).length,
    }))

    const coincidenciasPorPublicacion = misPublicaciones
        .map((p) => ({ etiqueta: p.descripcion, valor: usuariosCompatibles(p, busquedas), href: `/explorar/${p.id}` }))
        .sort((a, b) => b.valor - a.valor)

    function handleDescargarReporte() {
        generarReporteDemandaPDF({
            fecha: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }),
            periodo: OPCIONES_PERIODO.find((o) => o.valor === periodo)?.etiqueta ?? 'Todo el historial',
            busquedasActivas: busquedas.length,
            tipoMasBuscado: tipoMasBuscado ?? 'Sin datos aún',
            rangoMasSolicitado: rangoMasSolicitado && rangoMasSolicitado.valor > 0 ? rangoMasSolicitado.etiqueta : 'Sin datos aún',
            datosTipos,
            datosPrecios,
            datosZonas,
            tendencia,
            caracteristicas,
            coincidencias: coincidenciasPorPublicacion,
        })
    }

    return (
        <PanelLayout>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                <h1 className="flex items-center gap-2 text-lg sm:text-xl font-heading font-semibold text-foreground">
                    <BarChart3 className="w-5 h-5 text-primary" aria-hidden="true" />
                    Panel de demanda
                </h1>
                <button
                    type="button"
                    onClick={handleDescargarReporte}
                    className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-4 py-2 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                    <Download className="w-4 h-4" aria-hidden="true" />
                    Descargar reporte (PDF)
                </button>
            </div>
            <p className="text-sm text-muted mb-6">
                Información agregada y anónima sobre las búsquedas activas de la plataforma. No se
                muestran datos personales de los usuarios que buscan.
            </p>

            <div className="bg-surface rounded-2xl shadow-card p-4 sm:p-5 mb-6 flex flex-col gap-3">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <CalendarRange className="w-4 h-4 text-primary" aria-hidden="true" />
                    Período
                </h2>
                <div className="flex flex-wrap gap-1.5">
                    {OPCIONES_PERIODO.map((opcion) => (
                        <button
                            key={opcion.valor}
                            type="button"
                            onClick={() => setPeriodo(opcion.valor)}
                            aria-pressed={periodo === opcion.valor}
                            className={`text-sm font-semibold rounded-full px-3 py-1.5 transition-colors cursor-pointer ${periodo === opcion.valor
                                ? 'bg-primary text-surface'
                                : 'bg-surface-hover text-foreground hover:bg-primary-subtle'
                                }`}
                        >
                            {opcion.etiqueta}
                        </button>
                    ))}
                </div>
                {periodo === 'personalizado' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-1">Desde</label>
                            <input
                                type="date"
                                value={fechaDesde}
                                onChange={(e) => setFechaDesde(e.target.value)}
                                className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-1">Hasta</label>
                            <input
                                type="date"
                                value={fechaHasta}
                                onChange={(e) => setFechaHasta(e.target.value)}
                                className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-surface rounded-2xl shadow-card p-4 sm:p-5 mb-6 flex flex-col gap-3">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <SlidersHorizontal className="w-4 h-4 text-primary" aria-hidden="true" />
                    Segmentación
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">Localidad / barrio</label>
                        <select
                            value={zonaFiltro}
                            onChange={(e) => setZonaFiltro(e.target.value)}
                            className="custom-select w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                        >
                            <option value="todas">Todas las zonas</option>
                            {barriosDisponibles.map((barrio) => (
                                <option key={barrio} value={barrio}>
                                    {barrio}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">Tipo de propiedad</label>
                        <select
                            value={tipoFiltro}
                            onChange={(e) => setTipoFiltro(e.target.value as TipoInmueble | 'todos')}
                            className="custom-select w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                        >
                            <option value="todos">Todos los tipos</option>
                            {(Object.entries(ETIQUETAS_TIPO_INMUEBLE) as [TipoInmueble, string][]).map(([valor, etiqueta]) => (
                                <option key={valor} value={valor}>
                                    {etiqueta}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-surface rounded-2xl shadow-card p-5 flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-subtle text-primary shrink-0">
                        <Users className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <div>
                        <p className="text-2xl font-heading font-semibold text-foreground">{busquedas.length}</p>
                        <p className="text-xs text-muted">Búsquedas activas en el período</p>
                    </div>
                </div>

                <div className="bg-surface rounded-2xl shadow-card p-5 flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-accent-subtle text-accent shrink-0">
                        <Home className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <div>
                        <p className="text-lg font-heading font-semibold text-foreground">
                            {tipoMasBuscado ?? 'Sin datos aún'}
                        </p>
                        <p className="text-xs text-muted">Tipo de inmueble más buscado</p>
                    </div>
                </div>

                <div className="bg-surface rounded-2xl shadow-card p-5 flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-warning-subtle text-warning shrink-0">
                        <TrendingUp className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <div>
                        <p className="text-lg font-heading font-semibold text-foreground">
                            {rangoMasSolicitado && rangoMasSolicitado.valor > 0 ? rangoMasSolicitado.etiqueta : 'Sin datos aún'}
                        </p>
                        <p className="text-xs text-muted">Rango de precios más solicitado</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div className="bg-surface rounded-2xl shadow-card p-5">
                    <h2 className="font-heading font-semibold text-foreground mb-4">Demanda por tipo de inmueble</h2>
                    {datosTipos.length === 0 ? (
                        <p className="text-sm text-muted">Todavía no hay búsquedas activas con un tipo de inmueble definido.</p>
                    ) : (
                        <GraficoBarras datos={datosTipos} />
                    )}
                </div>

                <div className="bg-surface rounded-2xl shadow-card p-5">
                    <h2 className="font-heading font-semibold text-foreground mb-4">Demanda por rango de precio</h2>
                    {busquedas.length === 0 ? (
                        <p className="text-sm text-muted">Todavía no hay búsquedas activas con precio definido.</p>
                    ) : (
                        <GraficoBarras datos={datosPrecios} color="bg-warning" />
                    )}
                </div>
            </div>

            <div className="bg-surface rounded-2xl shadow-card p-5 mb-4">
                <h2 className="flex items-center gap-1.5 font-heading font-semibold text-foreground mb-4">
                    <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
                    Demanda por barrio/localidad
                </h2>
                {datosZonas.length === 0 ? (
                    <p className="text-sm text-muted">Todavía no hay búsquedas activas con una ubicación definida.</p>
                ) : (
                    <GraficoBarras datos={datosZonas} />
                )}
            </div>

            <div className="bg-surface rounded-2xl shadow-card p-5 mb-4">
                <h2 className="font-heading font-semibold text-foreground mb-1">Búsquedas nuevas por semana</h2>
                <p className="text-xs text-muted mb-4">Últimas cuatro semanas, según la fecha de creación de cada búsqueda.</p>
                <GraficoTendencia puntos={tendencia} />
            </div>

            <div className="bg-surface rounded-2xl shadow-card p-5 mb-4">
                <h2 className="font-heading font-semibold text-foreground mb-4">Características más demandadas</h2>
                {caracteristicas.every((c) => c.valor === 0) ? (
                    <p className="text-sm text-muted">Todavía no hay búsquedas activas con características específicas.</p>
                ) : (
                    <GraficoBarras datos={caracteristicas} color="bg-highlight" />
                )}
            </div>

            <div className="bg-surface rounded-2xl shadow-card p-5">
                <h2 className="flex items-center gap-1.5 font-heading font-semibold text-foreground mb-4">
                    <ListChecks className="w-4 h-4 text-primary" aria-hidden="true" />
                    Coincidencias con tus publicaciones activas
                </h2>
                {misPublicaciones.length === 0 ? (
                    <p className="text-sm text-muted">No tenés publicaciones activas para comparar.</p>
                ) : (
                    <GraficoBarras datos={coincidenciasPorPublicacion} color="bg-accent" anchoEtiqueta="w-40 sm:w-64" />
                )}
            </div>
        </PanelLayout>
    )
}

export default PanelDemanda
