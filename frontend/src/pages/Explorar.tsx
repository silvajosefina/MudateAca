import { useMemo, useState } from 'react'
import { BookmarkPlus, Heart, Home, MapPin, RotateCcw, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import PublicoLayout from '../layouts/PublicoLayout'
import TarjetaPublicacion from '../components/TarjetaPublicacion'
import Paginacion from '../components/Paginacion'
import { obtenerPublicacionesActivas } from '../mocks/publicaciones'
import { crearBusqueda } from '../mocks/busquedasActivas'
import { obtenerSesion } from '../mocks/sesion'
import { mostrarToast } from '../mocks/toast'
import { formatearMiles, quitarFormatoMiles } from '../utils/formato'
import type { ModalidadAlquiler, Publicacion, TipoInmueble } from '../types/publicacion'

interface Filtros {
    ubicacion: string
    modalidad: ModalidadAlquiler | 'todas'
    tipoInmueble: TipoInmueble | 'todos'
    precioMin: number
    precioMax: number
    ambientesMin: number
    dormitoriosMin: number
    amueblado: boolean
    serviciosIncluidos: boolean
    aceptaMascotas: boolean
    aptoEstudiantes: boolean
    fechaDeseadaDesde: string
    fechaDeseadaHasta: string
}

const FILTROS_INICIALES: Filtros = {
    ubicacion: '',
    modalidad: 'todas',
    tipoInmueble: 'todos',
    precioMin: 0,
    precioMax: 0,
    ambientesMin: 0,
    dormitoriosMin: 0,
    amueblado: false,
    serviciosIncluidos: false,
    aceptaMascotas: false,
    aptoEstudiantes: false,
    fechaDeseadaDesde: '',
    fechaDeseadaHasta: '',
}

const OPCIONES_MINIMO = [0, 1, 2, 3, 4, 5]
const RESULTADOS_POR_PAGINA = 9

function coincideConFiltros(publicacion: Publicacion, filtros: Filtros): boolean {
    if (
        filtros.ubicacion.trim() &&
        !publicacion.ubicacion.toLowerCase().includes(filtros.ubicacion.trim().toLowerCase())
    ) {
        return false
    }
    if (filtros.modalidad !== 'todas' && publicacion.modalidad !== filtros.modalidad) return false
    if (filtros.tipoInmueble !== 'todos' && publicacion.tipoInmueble !== filtros.tipoInmueble) return false
    if (filtros.precioMin && publicacion.precio < filtros.precioMin) return false
    if (filtros.precioMax && publicacion.precio > filtros.precioMax) return false
    if (filtros.ambientesMin && publicacion.ambientes < filtros.ambientesMin) return false
    if (filtros.dormitoriosMin && publicacion.dormitorios < filtros.dormitoriosMin) return false
    if (filtros.amueblado && !publicacion.amueblado) return false
    if (filtros.serviciosIncluidos && !publicacion.serviciosIncluidos) return false
    if (filtros.aceptaMascotas && !publicacion.aceptaMascotas) return false
    if (filtros.aptoEstudiantes && !publicacion.aptoEstudiantes) return false

    if (publicacion.modalidad === 'temporario' && (filtros.fechaDeseadaDesde || filtros.fechaDeseadaHasta)) {
        if (
            filtros.fechaDeseadaDesde &&
            publicacion.disponibleHasta &&
            filtros.fechaDeseadaDesde > publicacion.disponibleHasta
        ) {
            return false
        }
        if (filtros.fechaDeseadaHasta && publicacion.disponibleDesde > filtros.fechaDeseadaHasta) {
            return false
        }
    }

    return true
}

function Explorar() {
    const sesion = obtenerSesion()
    const [publicaciones] = useState<Publicacion[]>(() => obtenerPublicacionesActivas())
    const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIALES)
    const [nombreBusqueda, setNombreBusqueda] = useState('')
    const [paginaActual, setPaginaActual] = useState(1)
    const [, forzarActualizacion] = useState(0)

    function actualizarFiltro<K extends keyof Filtros>(campo: K, valor: Filtros[K]) {
        setFiltros((prev) => ({ ...prev, [campo]: valor }))
        setPaginaActual(1)
    }

    function handleGuardarBusqueda() {
        if (!sesion) return
        if (!hayFiltrosActivos) {
            mostrarToast('Aplicá al menos un filtro antes de guardar la búsqueda.', 'error')
            return
        }
        crearBusqueda(
            { ...filtros, nombre: nombreBusqueda.trim() || 'Búsqueda sin nombre' },
            sesion.id,
        )
        mostrarToast('Búsqueda guardada en "Mis búsquedas".')
        setNombreBusqueda('')
    }

    const resultados = useMemo(
        () => publicaciones.filter((p) => coincideConFiltros(p, filtros)),
        [publicaciones, filtros],
    )

    const hayFiltrosActivos = JSON.stringify(filtros) !== JSON.stringify(FILTROS_INICIALES)

    const totalPaginas = Math.max(1, Math.ceil(resultados.length / RESULTADOS_POR_PAGINA))
    const paginaSegura = Math.min(paginaActual, totalPaginas)
    const resultadosPagina = resultados.slice(
        (paginaSegura - 1) * RESULTADOS_POR_PAGINA,
        paginaSegura * RESULTADOS_POR_PAGINA,
    )

    return (
        <PublicoLayout>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-highlight px-6 py-10 sm:px-10 sm:py-14 text-foreground">
                <div className="grid grid-cols-1 sm:grid-cols-[1.3fr_1fr] gap-8 items-center">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-foreground/70 mb-2">
                            Alquileres en Trenque Lauquen
                        </p>
                        <h1 className="text-3xl sm:text-4xl font-heading font-bold leading-tight">
                            Tu próximo hogar
                            <br />
                            está acá.
                        </h1>
                        <p className="text-sm sm:text-base text-foreground/80 mt-3 max-w-md">
                            Explorá publicaciones activas de propietarios e inmobiliarias, sin avisos
                            engañosos y con la información que te ayuda a decidir.
                        </p>

                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-6 text-sm">
                            <span className="inline-flex items-center gap-1.5 font-semibold">
                                <Home className="w-4 h-4" aria-hidden="true" />
                                {publicaciones.length} publicaciones activas
                            </span>
                            <span className="inline-flex items-center gap-1.5 font-semibold">
                                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                                Publicaciones moderadas
                            </span>
                        </div>
                    </div>

                    <div className="relative hidden sm:flex items-center justify-center h-48">
                        <div className="absolute w-40 h-40 rounded-full bg-foreground/10" aria-hidden="true" />
                        <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-surface shadow-xl">
                            <Home className="w-11 h-11 text-primary" aria-hidden="true" />
                        </div>
                        <div className="absolute top-2 right-6 inline-flex items-center justify-center w-11 h-11 rounded-full bg-surface shadow-lg">
                            <MapPin className="w-5 h-5 text-accent" aria-hidden="true" />
                        </div>
                        <div className="absolute bottom-0 left-4 inline-flex items-center justify-center w-11 h-11 rounded-full bg-surface shadow-lg">
                            <Heart className="w-5 h-5 text-primary" aria-hidden="true" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative z-10 -mt-6 sm:-mt-8 bg-surface rounded-2xl shadow-xl border border-border/60 p-4 sm:p-5 mb-6 flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex gap-1.5 rounded-lg bg-surface-hover p-1">
                        {(
                            [
                                { valor: 'todas', etiqueta: 'Todas' },
                                { valor: 'residencial', etiqueta: 'Residencial' },
                                { valor: 'temporario', etiqueta: 'Temporario' },
                            ] as const
                        ).map((opcion) => (
                            <button
                                key={opcion.valor}
                                type="button"
                                onClick={() => actualizarFiltro('modalidad', opcion.valor)}
                                aria-pressed={filtros.modalidad === opcion.valor}
                                className={`text-sm font-semibold rounded-md px-3 py-1.5 transition-colors cursor-pointer ${filtros.modalidad === opcion.valor
                                    ? 'bg-primary text-foreground shadow'
                                    : 'text-muted hover:text-primary'
                                    }`}
                            >
                                {opcion.etiqueta}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setFiltros(FILTROS_INICIALES)
                            setPaginaActual(1)
                        }}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary transition-colors cursor-pointer"
                    >
                        <RotateCcw className="w-4 h-4" aria-hidden="true" />
                        Limpiar filtros
                    </button>
                </div>

                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground -mb-1">
                    <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                    Más filtros
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">Ubicación o zona</label>
                        <input
                            type="text"
                            placeholder="Barrio, ciudad"
                            value={filtros.ubicacion}
                            onChange={(e) => actualizarFiltro('ubicacion', e.target.value)}
                            className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">Tipo de inmueble</label>
                        <select
                            value={filtros.tipoInmueble}
                            onChange={(e) => actualizarFiltro('tipoInmueble', e.target.value as Filtros['tipoInmueble'])}
                            className="custom-select w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                        >
                            <option value="todos">Todos</option>
                            <option value="casa">Casa</option>
                            <option value="departamento">Departamento</option>
                            <option value="habitacion">Habitación</option>
                            <option value="residencia">Residencia</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">Precio mínimo</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Sin mínimo"
                            value={formatearMiles(filtros.precioMin)}
                            onChange={(e) => actualizarFiltro('precioMin', quitarFormatoMiles(e.target.value))}
                            className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">Precio máximo</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Sin máximo"
                            value={formatearMiles(filtros.precioMax)}
                            onChange={(e) => actualizarFiltro('precioMax', quitarFormatoMiles(e.target.value))}
                            className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">Ambientes (mín.)</label>
                        <select
                            value={filtros.ambientesMin}
                            onChange={(e) => actualizarFiltro('ambientesMin', Number(e.target.value))}
                            className="custom-select w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                        >
                            {OPCIONES_MINIMO.map((cantidad) => (
                                <option key={cantidad} value={cantidad}>
                                    {cantidad === 0 ? 'Cualquiera' : cantidad === 5 ? '5 o más' : cantidad}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">Dormitorios (mín.)</label>
                        <select
                            value={filtros.dormitoriosMin}
                            onChange={(e) => actualizarFiltro('dormitoriosMin', Number(e.target.value))}
                            className="custom-select w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                        >
                            {OPCIONES_MINIMO.map((cantidad) => (
                                <option key={cantidad} value={cantidad}>
                                    {cantidad === 0 ? 'Cualquiera' : cantidad === 5 ? '5 o más' : cantidad}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {filtros.modalidad === 'temporario' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-hover rounded-lg p-4">
                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-1">
                                Fecha deseada desde
                            </label>
                            <input
                                type="date"
                                value={filtros.fechaDeseadaDesde}
                                onChange={(e) => actualizarFiltro('fechaDeseadaDesde', e.target.value)}
                                className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-1">
                                Fecha deseada hasta
                            </label>
                            <input
                                type="date"
                                value={filtros.fechaDeseadaHasta}
                                onChange={(e) => actualizarFiltro('fechaDeseadaHasta', e.target.value)}
                                className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filtros.amueblado}
                            onChange={(e) => actualizarFiltro('amueblado', e.target.checked)}
                            className="accent-primary cursor-pointer"
                        />
                        Amueblado
                    </label>
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filtros.serviciosIncluidos}
                            onChange={(e) => actualizarFiltro('serviciosIncluidos', e.target.checked)}
                            className="accent-primary cursor-pointer"
                        />
                        Servicios incluidos
                    </label>
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filtros.aceptaMascotas}
                            onChange={(e) => actualizarFiltro('aceptaMascotas', e.target.checked)}
                            className="accent-primary cursor-pointer"
                        />
                        Acepta mascotas
                    </label>
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filtros.aptoEstudiantes}
                            onChange={(e) => actualizarFiltro('aptoEstudiantes', e.target.checked)}
                            className="accent-primary cursor-pointer"
                        />
                        Apto estudiantes
                    </label>
                </div>

                {sesion?.rol === 'interesado' && (
                    <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-border">
                        <input
                            type="text"
                            placeholder="Nombre para esta búsqueda (opcional)"
                            value={nombreBusqueda}
                            onChange={(e) => setNombreBusqueda(e.target.value)}
                            className="flex-1 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                            type="button"
                            onClick={handleGuardarBusqueda}
                            className="inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-foreground font-heading font-semibold rounded-lg px-4 py-2 transition-colors cursor-pointer whitespace-nowrap"
                        >
                            <BookmarkPlus className="w-4 h-4" aria-hidden="true" />
                            Guardar esta búsqueda
                        </button>
                    </div>
                )}
            </div>

            <h2 className="text-sm font-semibold text-foreground mb-4">
                {hayFiltrosActivos
                    ? resultados.length === 0
                        ? 'No se encontraron publicaciones con esos filtros.'
                        : `${resultados.length} publicación(es) encontrada(s).`
                    : 'Publicaciones disponibles'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {resultadosPagina.map((publicacion) => (
                    <TarjetaPublicacion
                        key={publicacion.id}
                        publicacion={publicacion}
                        onFavoritoCambiado={() => forzarActualizacion((n) => n + 1)}
                    />
                ))}
            </div>

            <Paginacion paginaActual={paginaSegura} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
        </PublicoLayout>
    )
}

export default Explorar
