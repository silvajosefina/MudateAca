import { BarChart3, Download, Home, ListChecks, TrendingUp, Users } from 'lucide-react'
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

function PanelDemanda() {
    const sesion = obtenerSesion()

    if (!sesion) return null

    const busquedas = obtenerTodasLasBusquedasActivas()
    const misPublicaciones = obtenerPublicacionesDeUsuario(sesion.id).filter((p) => p.estado === 'activa')

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

    const caracteristicas = [
        { etiqueta: 'Acepta mascotas', valor: busquedas.filter((b) => b.aceptaMascotas).length },
        { etiqueta: 'Amueblado', valor: busquedas.filter((b) => b.amueblado).length },
        { etiqueta: 'Apto estudiantes', valor: busquedas.filter((b) => b.aptoEstudiantes).length },
        { etiqueta: 'Servicios incluidos', valor: busquedas.filter((b) => b.serviciosIncluidos).length },
    ].sort((a, b) => b.valor - a.valor)

    const tendencia = SEMANAS.map((etiqueta, indice) => ({
        etiqueta,
        valor: busquedas.filter((b) => semanaDesdeCreacion(b.creadaEn) === indice).length,
    }))

    const coincidenciasPorPublicacion = misPublicaciones
        .map((p) => ({ etiqueta: p.descripcion.slice(0, 28) + (p.descripcion.length > 28 ? '…' : ''), valor: usuariosCompatibles(p, busquedas) }))
        .sort((a, b) => b.valor - a.valor)

    function handleDescargarReporte() {
        generarReporteDemandaPDF({
            fecha: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }),
            busquedasActivas: busquedas.length,
            tipoMasBuscado: tipoMasBuscado ?? 'Sin datos aún',
            rangoMasSolicitado: rangoMasSolicitado && rangoMasSolicitado.valor > 0 ? rangoMasSolicitado.etiqueta : 'Sin datos aún',
            datosTipos,
            datosPrecios,
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-surface rounded-2xl shadow-lg p-5 flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-subtle text-primary shrink-0">
                        <Users className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <div>
                        <p className="text-2xl font-heading font-semibold text-foreground">{busquedas.length}</p>
                        <p className="text-xs text-muted">Búsquedas activas en la plataforma</p>
                    </div>
                </div>

                <div className="bg-surface rounded-2xl shadow-lg p-5 flex items-center gap-3">
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

                <div className="bg-surface rounded-2xl shadow-lg p-5 flex items-center gap-3">
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
                <div className="bg-surface rounded-2xl shadow-lg p-5">
                    <h2 className="font-heading font-semibold text-foreground mb-4">Demanda por tipo de inmueble</h2>
                    {datosTipos.length === 0 ? (
                        <p className="text-sm text-muted">Todavía no hay búsquedas activas con un tipo de inmueble definido.</p>
                    ) : (
                        <GraficoBarras datos={datosTipos} />
                    )}
                </div>

                <div className="bg-surface rounded-2xl shadow-lg p-5">
                    <h2 className="font-heading font-semibold text-foreground mb-4">Demanda por rango de precio</h2>
                    {busquedas.length === 0 ? (
                        <p className="text-sm text-muted">Todavía no hay búsquedas activas con precio definido.</p>
                    ) : (
                        <GraficoBarras datos={datosPrecios} color="bg-accent" />
                    )}
                </div>
            </div>

            <div className="bg-surface rounded-2xl shadow-lg p-5 mb-4">
                <h2 className="font-heading font-semibold text-foreground mb-1">Búsquedas nuevas por semana</h2>
                <p className="text-xs text-muted mb-4">Últimas cuatro semanas, según la fecha de creación de cada búsqueda.</p>
                <GraficoTendencia puntos={tendencia} />
            </div>

            <div className="bg-surface rounded-2xl shadow-lg p-5 mb-4">
                <h2 className="font-heading font-semibold text-foreground mb-4">Características más demandadas</h2>
                {caracteristicas.every((c) => c.valor === 0) ? (
                    <p className="text-sm text-muted">Todavía no hay búsquedas activas con características específicas.</p>
                ) : (
                    <GraficoBarras datos={caracteristicas} color="bg-highlight" />
                )}
            </div>

            <div className="bg-surface rounded-2xl shadow-lg p-5">
                <h2 className="flex items-center gap-1.5 font-heading font-semibold text-foreground mb-4">
                    <ListChecks className="w-4 h-4 text-primary" aria-hidden="true" />
                    Coincidencias con tus publicaciones activas
                </h2>
                {misPublicaciones.length === 0 ? (
                    <p className="text-sm text-muted">No tenés publicaciones activas para comparar.</p>
                ) : (
                    <GraficoBarras datos={coincidenciasPorPublicacion} color="bg-accent" />
                )}
            </div>
        </PanelLayout>
    )
}

export default PanelDemanda
