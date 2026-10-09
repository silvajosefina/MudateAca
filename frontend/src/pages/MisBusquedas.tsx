import { useState, type SubmitEvent } from 'react'
import { Link } from 'react-router'
import {
    ArrowRight,
    BedDouble,
    ChevronDown,
    ChevronUp,
    DoorOpen,
    MapPin,
    Pause,
    Pencil,
    Play,
    Plus,
    SearchCheck,
    Trash2,
    X,
} from 'lucide-react'
import PublicoLayout from '../layouts/PublicoLayout'
import ConfirmDialog from '../components/ConfirmDialog'
import Paginacion from '../components/Paginacion'
import {
    actualizarBusqueda,
    cambiarEstadoBusqueda,
    crearBusqueda,
    eliminarBusqueda,
    obtenerBusquedasDeUsuario,
    obtenerCoincidenciasDeBusqueda,
} from '../mocks/busquedasActivas'
import { obtenerSesion } from '../mocks/sesion'
import { mostrarToast } from '../mocks/toast'
import { formatearMiles, formatearPrecio, quitarFormatoMiles } from '../utils/formato'
import type { BusquedaActiva, BusquedaFormData } from '../types/busqueda'
import { ETIQUETAS_TIPO_INMUEBLE, type ModalidadAlquiler, type TipoInmueble } from '../types/publicacion'

const OPCIONES_MINIMO = [0, 1, 2, 3, 4, 5]
const RESULTADOS_POR_PAGINA = 5
const COINCIDENCIAS_VISIBLES = 2

function valorInicial(busqueda?: BusquedaActiva): BusquedaFormData {
    return {
        nombre: busqueda?.nombre ?? '',
        modalidad: busqueda?.modalidad ?? 'todas',
        tipoInmueble: busqueda?.tipoInmueble ?? 'todos',
        precioMin: busqueda?.precioMin ?? 0,
        precioMax: busqueda?.precioMax ?? 0,
        ambientesMin: busqueda?.ambientesMin ?? 0,
        dormitoriosMin: busqueda?.dormitoriosMin ?? 0,
        ubicacion: busqueda?.ubicacion ?? '',
        amueblado: busqueda?.amueblado ?? false,
        serviciosIncluidos: busqueda?.serviciosIncluidos ?? false,
        aceptaMascotas: busqueda?.aceptaMascotas ?? false,
        aptoEstudiantes: busqueda?.aptoEstudiantes ?? false,
        fechaDeseadaDesde: busqueda?.fechaDeseadaDesde ?? '',
        fechaDeseadaHasta: busqueda?.fechaDeseadaHasta ?? '',
    }
}

function tieneCriterios(datos: BusquedaFormData): boolean {
    return Boolean(
        datos.ubicacion.trim() ||
        datos.modalidad !== 'todas' ||
        datos.tipoInmueble !== 'todos' ||
        datos.precioMin > 0 ||
        datos.precioMax > 0 ||
        datos.ambientesMin > 0 ||
        datos.dormitoriosMin > 0 ||
        datos.amueblado ||
        datos.serviciosIncluidos ||
        datos.aceptaMascotas ||
        datos.aptoEstudiantes ||
        datos.fechaDeseadaDesde ||
        datos.fechaDeseadaHasta,
    )
}

function resumenCriterios(busqueda: BusquedaActiva): string {
    const partes: string[] = []
    if (busqueda.modalidad !== 'todas') partes.push(busqueda.modalidad)
    if (busqueda.tipoInmueble !== 'todos') partes.push(ETIQUETAS_TIPO_INMUEBLE[busqueda.tipoInmueble])
    if (busqueda.ubicacion.trim()) partes.push(busqueda.ubicacion.trim())
    if (busqueda.precioMin) partes.push(`desde ${formatearPrecio(busqueda.precioMin)}`)
    if (busqueda.precioMax) partes.push(`hasta ${formatearPrecio(busqueda.precioMax)}`)
    if (busqueda.ambientesMin) partes.push(`${busqueda.ambientesMin}+ amb.`)
    if (busqueda.dormitoriosMin) partes.push(`${busqueda.dormitoriosMin}+ dorm.`)
    return partes.length > 0 ? partes.join(' · ') : 'Sin filtros específicos'
}

function criteriosDeFiltro(datos: BusquedaFormData) {
    return {
        modalidad: datos.modalidad,
        tipoInmueble: datos.tipoInmueble,
        precioMin: datos.precioMin,
        precioMax: datos.precioMax,
        ambientesMin: datos.ambientesMin,
        dormitoriosMin: datos.dormitoriosMin,
        ubicacion: datos.ubicacion,
        amueblado: datos.amueblado,
        serviciosIncluidos: datos.serviciosIncluidos,
        aceptaMascotas: datos.aceptaMascotas,
        aptoEstudiantes: datos.aptoEstudiantes,
        fechaDeseadaDesde: datos.fechaDeseadaDesde,
        fechaDeseadaHasta: datos.fechaDeseadaHasta,
    }
}

function construirQueryExplorar(busqueda: BusquedaActiva): string {
    const params = new URLSearchParams()
    if (busqueda.ubicacion.trim()) params.set('ubicacion', busqueda.ubicacion.trim())
    if (busqueda.modalidad !== 'todas') params.set('modalidad', busqueda.modalidad)
    if (busqueda.tipoInmueble !== 'todos') params.set('tipoInmueble', busqueda.tipoInmueble)
    if (busqueda.precioMin) params.set('precioMin', String(busqueda.precioMin))
    if (busqueda.precioMax) params.set('precioMax', String(busqueda.precioMax))
    if (busqueda.ambientesMin) params.set('ambientesMin', String(busqueda.ambientesMin))
    if (busqueda.dormitoriosMin) params.set('dormitoriosMin', String(busqueda.dormitoriosMin))
    if (busqueda.amueblado) params.set('amueblado', '1')
    if (busqueda.serviciosIncluidos) params.set('serviciosIncluidos', '1')
    if (busqueda.aceptaMascotas) params.set('aceptaMascotas', '1')
    if (busqueda.aptoEstudiantes) params.set('aptoEstudiantes', '1')
    if (busqueda.fechaDeseadaDesde) params.set('fechaDeseadaDesde', busqueda.fechaDeseadaDesde)
    if (busqueda.fechaDeseadaHasta) params.set('fechaDeseadaHasta', busqueda.fechaDeseadaHasta)
    return params.toString()
}

function MisBusquedas() {
    const sesion = obtenerSesion()
    const [busquedas, setBusquedas] = useState<BusquedaActiva[]>(() =>
        sesion ? obtenerBusquedasDeUsuario(sesion.id) : [],
    )
    const [editando, setEditando] = useState<BusquedaActiva | null>(null)
    const [mostrarFormulario, setMostrarFormulario] = useState(false)
    const [datos, setDatos] = useState<BusquedaFormData>(valorInicial())
    const [expandida, setExpandida] = useState<string | null>(null)
    const [aEliminar, setAEliminar] = useState<BusquedaActiva | null>(null)
    const [errorCriterios, setErrorCriterios] = useState(false)
    const [errorDuplicado, setErrorDuplicado] = useState(false)
    const [paginaActual, setPaginaActual] = useState(1)

    if (!sesion) return null

    function refrescar() {
        setBusquedas(obtenerBusquedasDeUsuario(sesion!.id))
    }

    function actualizarCampo<K extends keyof BusquedaFormData>(campo: K, valor: BusquedaFormData[K]) {
        setDatos((prev) => ({ ...prev, [campo]: valor }))
    }

    function handleNueva() {
        setEditando(null)
        setDatos(valorInicial())
        setErrorCriterios(false)
        setErrorDuplicado(false)
        setMostrarFormulario(true)
    }

    function handleEditar(busqueda: BusquedaActiva) {
        setEditando(busqueda)
        setDatos(valorInicial(busqueda))
        setErrorCriterios(false)
        setErrorDuplicado(false)
        setMostrarFormulario(true)
    }

    function hayDuplicado(datosAGuardar: BusquedaFormData, idAExcluir?: string): boolean {
        const criteriosNuevos = JSON.stringify(criteriosDeFiltro(datosAGuardar))
        return busquedas.some(
            (b) => b.id !== idAExcluir && JSON.stringify(criteriosDeFiltro(b)) === criteriosNuevos,
        )
    }

    function handleGuardar(e: SubmitEvent) {
        e.preventDefault()

        if (!tieneCriterios(datos)) {
            setErrorCriterios(true)
            return
        }
        setErrorCriterios(false)

        if (hayDuplicado(datos, editando?.id)) {
            setErrorDuplicado(true)
            return
        }
        setErrorDuplicado(false)

        const nombreFinal = { ...datos, nombre: datos.nombre.trim() || 'Búsqueda sin nombre' }
        if (editando) {
            actualizarBusqueda(editando.id, nombreFinal, sesion!.id)
            mostrarToast('Búsqueda actualizada.')
        } else {
            crearBusqueda(nombreFinal, sesion!.id)
            mostrarToast('Búsqueda creada correctamente.')
        }
        setMostrarFormulario(false)
        refrescar()
    }

    function handlePausar(busqueda: BusquedaActiva) {
        cambiarEstadoBusqueda(busqueda.id, sesion!.id, 'pausada')
        mostrarToast('Búsqueda pausada.')
        refrescar()
    }

    function handleReactivar(busqueda: BusquedaActiva) {
        cambiarEstadoBusqueda(busqueda.id, sesion!.id, 'activa')
        mostrarToast('Búsqueda reactivada.')
        refrescar()
    }

    function confirmarEliminar() {
        if (!aEliminar) return
        eliminarBusqueda(aEliminar.id, sesion!.id)
        mostrarToast('Búsqueda eliminada.')
        setAEliminar(null)
        refrescar()
    }

    const totalPaginas = Math.max(1, Math.ceil(busquedas.length / RESULTADOS_POR_PAGINA))
    const paginaSegura = Math.min(paginaActual, totalPaginas)
    const busquedasPagina = busquedas.slice(
        (paginaSegura - 1) * RESULTADOS_POR_PAGINA,
        paginaSegura * RESULTADOS_POR_PAGINA,
    )

    return (
        <PublicoLayout>
            <div className="flex items-center justify-between mb-6">
                <h1 className="flex items-center gap-2 text-lg sm:text-xl font-heading font-semibold text-foreground">
                    <SearchCheck className="w-5 h-5 text-primary" aria-hidden="true" />
                    Mis búsquedas activas
                </h1>
                <button
                    type="button"
                    onClick={handleNueva}
                    className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-surface font-heading font-semibold rounded-lg px-4 py-2 transition-colors cursor-pointer"
                >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    Nueva búsqueda
                </button>
            </div>

            {busquedas.length === 0 ? (
                <div className="bg-surface rounded-2xl shadow-lg p-8 text-center text-sm text-muted">
                    Todavía no guardaste ninguna búsqueda. Creá una para que te avisemos cuando aparezca
                    una propiedad compatible.
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {busquedasPagina.map((busqueda) => {
                        const coincidencias = obtenerCoincidenciasDeBusqueda(busqueda)
                        const expandido = expandida === busqueda.id

                        return (
                            <div key={busqueda.id} className="bg-surface rounded-2xl shadow-lg p-4 sm:p-5">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="font-heading font-semibold text-foreground">{busqueda.nombre}</h2>
                                            <span
                                                className={`text-xs font-semibold rounded-full px-2.5 py-1 ${busqueda.estado === 'activa' ? 'bg-accent-subtle text-accent' : 'bg-warning-subtle text-warning'
                                                    }`}
                                            >
                                                {busqueda.estado === 'activa' ? 'Activa' : 'Pausada'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted mt-1">{resumenCriterios(busqueda)}</p>
                                    </div>

                                    <div className="flex flex-wrap gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setExpandida(expandido ? null : busqueda.id)}
                                            aria-expanded={expandido}
                                            className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-border text-foreground hover:border-primary transition-colors cursor-pointer whitespace-nowrap"
                                        >
                                            {coincidencias.length} coincidencia(s)
                                            {expandido ? (
                                                <ChevronUp className="w-4 h-4" aria-hidden="true" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4" aria-hidden="true" />
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleEditar(busqueda)}
                                            className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-border text-foreground hover:border-primary transition-colors cursor-pointer"
                                        >
                                            <Pencil className="w-4 h-4" aria-hidden="true" />
                                            Editar
                                        </button>
                                        {busqueda.estado === 'activa' ? (
                                            <button
                                                type="button"
                                                onClick={() => handlePausar(busqueda)}
                                                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-border text-foreground hover:border-primary transition-colors cursor-pointer"
                                            >
                                                <Pause className="w-4 h-4" aria-hidden="true" />
                                                Pausar
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleReactivar(busqueda)}
                                                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-border text-foreground hover:border-primary transition-colors cursor-pointer"
                                            >
                                                <Play className="w-4 h-4" aria-hidden="true" />
                                                Reactivar
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setAEliminar(busqueda)}
                                            className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-danger text-danger hover:bg-danger hover:text-white transition-colors cursor-pointer"
                                        >
                                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                                            Eliminar
                                        </button>
                                    </div>
                                </div>

                                {expandido && (
                                    <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
                                        {coincidencias.length === 0 ? (
                                            <p className="text-sm text-muted">
                                                Todavía no hay publicaciones compatibles con esta búsqueda.
                                            </p>
                                        ) : (
                                            coincidencias.slice(0, COINCIDENCIAS_VISIBLES).map(({ publicacion, porcentaje }) => (
                                                <Link
                                                    key={publicacion.id}
                                                    to={`/explorar/${publicacion.id}`}
                                                    className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary transition-colors cursor-pointer"
                                                >
                                                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-hover shrink-0">
                                                        {publicacion.fotos[0] && (
                                                            <img
                                                                src={publicacion.fotos[0]}
                                                                alt={publicacion.descripcion}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-foreground">
                                                            {formatearPrecio(publicacion.precio)}
                                                        </p>
                                                        <p className="text-xs text-muted flex items-center gap-1 truncate">
                                                            <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                                                            {publicacion.ubicacion}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-xs text-muted">
                                                            <span className="flex items-center gap-1">
                                                                <DoorOpen className="w-3 h-3" aria-hidden="true" />
                                                                {publicacion.ambientes}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <BedDouble className="w-3 h-3" aria-hidden="true" />
                                                                {publicacion.dormitorios}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="text-sm font-heading font-semibold text-accent shrink-0">
                                                        {porcentaje}%
                                                    </span>
                                                </Link>
                                            ))
                                        )}
                                        {coincidencias.length > COINCIDENCIAS_VISIBLES && (
                                            <Link
                                                to={`/explorar?${construirQueryExplorar(busqueda)}`}
                                                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-border text-foreground hover:border-primary transition-colors cursor-pointer self-start"
                                            >
                                                Ver todas en Explorar
                                                <ArrowRight className="w-4 h-4" aria-hidden="true" />
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            <Paginacion paginaActual={paginaSegura} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />

            {mostrarFormulario && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/70 backdrop-blur-sm p-4"
                    onClick={() => setMostrarFormulario(false)}
                >
                    <form
                        onSubmit={handleGuardar}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-surface rounded-2xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 flex flex-col gap-4"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-heading font-semibold text-foreground">
                                {editando ? 'Editar búsqueda' : 'Nueva búsqueda'}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setMostrarFormulario(false)}
                                aria-label="Cerrar"
                                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" aria-hidden="true" />
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-1">Nombre de la búsqueda</label>
                            <input
                                type="text"
                                placeholder="Ej: Depto cerca del centro"
                                value={datos.nombre}
                                onChange={(e) => actualizarCampo('nombre', e.target.value)}
                                className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-foreground mb-1">Ubicación o zona</label>
                                <input
                                    type="text"
                                    placeholder="Barrio, ciudad"
                                    value={datos.ubicacion}
                                    onChange={(e) => actualizarCampo('ubicacion', e.target.value)}
                                    className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-foreground mb-1">Modalidad</label>
                                <select
                                    value={datos.modalidad}
                                    onChange={(e) => actualizarCampo('modalidad', e.target.value as ModalidadAlquiler | 'todas')}
                                    className="custom-select w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                                >
                                    <option value="todas">Todas</option>
                                    <option value="residencial">Residencial</option>
                                    <option value="temporario">Temporario</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-foreground mb-1">Tipo de inmueble</label>
                                <select
                                    value={datos.tipoInmueble}
                                    onChange={(e) => actualizarCampo('tipoInmueble', e.target.value as TipoInmueble | 'todos')}
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
                                    value={formatearMiles(datos.precioMin)}
                                    onChange={(e) => actualizarCampo('precioMin', quitarFormatoMiles(e.target.value))}
                                    className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-foreground mb-1">Precio máximo</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Sin máximo"
                                    value={formatearMiles(datos.precioMax)}
                                    onChange={(e) => actualizarCampo('precioMax', quitarFormatoMiles(e.target.value))}
                                    className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-foreground mb-1">Ambientes (mín.)</label>
                                <select
                                    value={datos.ambientesMin}
                                    onChange={(e) => actualizarCampo('ambientesMin', Number(e.target.value))}
                                    className="custom-select w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                                >
                                    {OPCIONES_MINIMO.map((c) => (
                                        <option key={c} value={c}>{c === 0 ? 'Cualquiera' : c === 5 ? '5 o más' : c}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-foreground mb-1">Dormitorios (mín.)</label>
                                <select
                                    value={datos.dormitoriosMin}
                                    onChange={(e) => actualizarCampo('dormitoriosMin', Number(e.target.value))}
                                    className="custom-select w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                                >
                                    {OPCIONES_MINIMO.map((c) => (
                                        <option key={c} value={c}>{c === 0 ? 'Cualquiera' : c === 5 ? '5 o más' : c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {datos.modalidad === 'temporario' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-hover rounded-lg p-4">
                                <div>
                                    <label className="block text-sm font-semibold text-foreground mb-1">Fecha deseada desde</label>
                                    <input
                                        type="date"
                                        value={datos.fechaDeseadaDesde}
                                        onChange={(e) => actualizarCampo('fechaDeseadaDesde', e.target.value)}
                                        className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-foreground mb-1">Fecha deseada hasta</label>
                                    <input
                                        type="date"
                                        value={datos.fechaDeseadaHasta}
                                        onChange={(e) => actualizarCampo('fechaDeseadaHasta', e.target.value)}
                                        className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={datos.amueblado}
                                    onChange={(e) => actualizarCampo('amueblado', e.target.checked)}
                                    className="accent-primary cursor-pointer"
                                />
                                Amueblado
                            </label>
                            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={datos.serviciosIncluidos}
                                    onChange={(e) => actualizarCampo('serviciosIncluidos', e.target.checked)}
                                    className="accent-primary cursor-pointer"
                                />
                                Servicios incluidos
                            </label>
                            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={datos.aceptaMascotas}
                                    onChange={(e) => actualizarCampo('aceptaMascotas', e.target.checked)}
                                    className="accent-primary cursor-pointer"
                                />
                                Acepta mascotas
                            </label>
                            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={datos.aptoEstudiantes}
                                    onChange={(e) => actualizarCampo('aptoEstudiantes', e.target.checked)}
                                    className="accent-primary cursor-pointer"
                                />
                                Apto estudiantes
                            </label>
                        </div>

                        {errorCriterios && (
                            <p className="text-sm text-danger bg-danger-subtle border border-danger/20 rounded-lg px-3 py-2">
                                Completá al menos un criterio de búsqueda (ubicación, modalidad, tipo, precio,
                                ambientes, dormitorios o alguna característica) para poder guardarla.
                            </p>
                        )}

                        {errorDuplicado && (
                            <p className="text-sm text-danger bg-danger-subtle border border-danger/20 rounded-lg px-3 py-2">
                                Ya tenés una búsqueda guardada con exactamente estos mismos filtros.
                            </p>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3 mt-2">
                            <button
                                type="submit"
                                className="bg-primary hover:bg-primary-hover text-surface font-heading font-semibold rounded-lg py-2 px-6 transition-colors cursor-pointer"
                            >
                                {editando ? 'Guardar cambios' : 'Crear búsqueda'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setMostrarFormulario(false)}
                                className="text-sm font-semibold rounded-lg py-2 px-6 border border-border text-foreground hover:border-primary transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {aEliminar && (
                <ConfirmDialog
                    titulo="Eliminar búsqueda"
                    mensaje={`¿Eliminar la búsqueda "${aEliminar.nombre}"? Ya no se generarán coincidencias para ella.`}
                    textoConfirmar="Eliminar"
                    peligroso
                    colorConfirmar="accent"
                    onConfirmar={confirmarEliminar}
                    onCancelar={() => setAEliminar(null)}
                />
            )}
        </PublicoLayout>
    )
}

export default MisBusquedas
