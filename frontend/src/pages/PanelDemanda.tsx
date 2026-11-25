import { useState } from 'react'
import { BarChart3, CalendarRange, Download, Home, ListChecks, MapPin, SlidersHorizontal, TrendingUp, Users } from 'lucide-react'
import PanelLayout from '../layouts/PanelLayout'
import GraficoBarras from '../components/GraficoBarras'
import GraficoTendencia from '../components/GraficoTendencia'
import { obtenerDemanda, type Demanda } from '../servicios/demanda'
import { mensajeDeError } from '../servicios/errores'
import { obtenerSesion } from '../servicios/sesion'
import { useConsulta } from '../hooks/useConsulta'
import { ETIQUETAS_TIPO_INMUEBLE, type TipoInmueble } from '../types/publicacion'

type PeriodoPreset = 'todos' | '30d' | '3m' | '1a' | 'personalizado'

const OPCIONES_PERIODO: { valor: PeriodoPreset; etiqueta: string }[] = [
    { valor: 'todos', etiqueta: 'Todo el historial' },
    { valor: '30d', etiqueta: 'Últimos 30 días' },
    { valor: '3m', etiqueta: 'Últimos 3 meses' },
    { valor: '1a', etiqueta: 'Último año' },
    { valor: 'personalizado', etiqueta: 'Rango personalizado' },
]

const SIN_DATOS: Demanda = {
    busquedasActivas: 0,
    usuariosBuscando: 0,
    porTipo: [],
    porRangoPrecio: [],
    porZona: [],
    caracteristicas: [],
    tendenciaSemanal: [],
    coincidenciasPorPublicacion: [],
    zonasDisponibles: [],
}

function fechaISO(fecha: Date): string {
    const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 10)
}

// Traduce el período elegido a las fechas "desde" y "hasta" que filtra la API.
function limitesPeriodo(periodo: PeriodoPreset, fechaDesde: string, fechaHasta: string): { desde?: string; hasta?: string } {
    const ahora = new Date()
    switch (periodo) {
        case '30d':
            return { desde: fechaISO(new Date(ahora.getTime() - 30 * 86400000)) }
        case '3m': {
            const desde = new Date(ahora)
            desde.setMonth(desde.getMonth() - 3)
            return { desde: fechaISO(desde) }
        }
        case '1a': {
            const desde = new Date(ahora)
            desde.setFullYear(desde.getFullYear() - 1)
            return { desde: fechaISO(desde) }
        }
        case 'personalizado':
            return { desde: fechaDesde || undefined, hasta: fechaHasta || undefined }
        default:
            return {}
    }
}

const HOY = fechaISO(new Date())

function PanelDemanda() {
    const sesion = obtenerSesion()
    const [periodo, setPeriodo] = useState<PeriodoPreset>('todos')
    const [fechaDesde, setFechaDesde] = useState('')
    const [fechaHasta, setFechaHasta] = useState('')
    const [zonaFiltro, setZonaFiltro] = useState('todas')
    const [tipoFiltro, setTipoFiltro] = useState<TipoInmueble | 'todos'>('todos')

    const filtros = {
        ...limitesPeriodo(periodo, fechaDesde, fechaHasta),
        zona: zonaFiltro === 'todas' ? undefined : zonaFiltro,
        tipoInmueble: tipoFiltro === 'todos' ? undefined : tipoFiltro,
    }
    const consulta = useConsulta(JSON.stringify(filtros), () => obtenerDemanda(filtros))
    const demanda = consulta.datos ?? SIN_DATOS

    if (!sesion) return null

    const datosTipos = demanda.porTipo
    const datosPrecios = demanda.porRangoPrecio
    const datosZonas = demanda.porZona
    const caracteristicas = demanda.caracteristicas
    // La tendencia mira siempre las últimas cuatro semanas, más allá del período elegido.
    const tendencia = demanda.tendenciaSemanal
    const coincidenciasPorPublicacion = demanda.coincidenciasPorPublicacion
    const tipoMasBuscado = demanda.tipoMasBuscado
    const rangoMasSolicitado = demanda.rangoMasSolicitado
    // Si la zona elegida deja de tener búsquedas, igual se mantiene en el selector.
    const barriosDisponibles = zonaFiltro !== 'todas' && !demanda.zonasDisponibles.includes(zonaFiltro)
        ? [...demanda.zonasDisponibles, zonaFiltro]
        : demanda.zonasDisponibles

    async function handleDescargarReporte() {
        // jsPDF es pesado: se descarga recién cuando se pide el reporte.
        const { generarReporteDemandaPDF } = await import('../utils/pdf')
        generarReporteDemandaPDF({
            fecha: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }),
            periodo: OPCIONES_PERIODO.find((o) => o.valor === periodo)?.etiqueta ?? 'Todo el historial',
            busquedasActivas: demanda.busquedasActivas,
            tipoMasBuscado: tipoMasBuscado ?? 'Sin datos aún',
            rangoMasSolicitado: rangoMasSolicitado ?? 'Sin datos aún',
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
            {consulta.error ? (
                <p className="text-sm text-danger bg-danger-subtle border border-danger/20 rounded-lg px-3 py-2 mb-6">
                    {mensajeDeError(consulta.error, 'No se pudo cargar la demanda.')}
                </p>
            ) : null}

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
                                max={HOY}
                                onChange={(e) => {
                                    setFechaDesde(e.target.value)
                                    if (fechaHasta && e.target.value > fechaHasta) setFechaHasta(e.target.value)
                                }}
                                className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-1">Hasta</label>
                            <input
                                type="date"
                                value={fechaHasta}
                                min={fechaDesde || undefined}
                                max={HOY}
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
                        <p className="text-2xl font-heading font-semibold text-foreground">
                            {consulta.cargando && !consulta.datos ? '…' : demanda.busquedasActivas}
                        </p>
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
                            {rangoMasSolicitado ?? 'Sin datos aún'}
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
                    {datosPrecios.every((rango) => rango.valor === 0) ? (
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
                {coincidenciasPorPublicacion.length === 0 ? (
                    <p className="text-sm text-muted">No tenés publicaciones activas para comparar.</p>
                ) : (
                    <GraficoBarras datos={coincidenciasPorPublicacion} color="bg-accent" anchoEtiqueta="w-40 sm:w-64" />
                )}
            </div>
        </PanelLayout>
    )
}

export default PanelDemanda
