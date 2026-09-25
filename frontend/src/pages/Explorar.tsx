import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { BedDouble, DoorOpen, MapPin, RotateCcw, Search, SlidersHorizontal, User } from 'lucide-react'
import PublicoLayout from '../layouts/PublicoLayout'
import { obtenerPublicacionesActivas } from '../mocks/publicaciones'
import { obtenerUsuarioPorId } from '../mocks/usuarios'
import { formatearMiles, formatearPrecio, quitarFormatoMiles } from '../utils/formato'
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
    const [publicaciones] = useState<Publicacion[]>(() => obtenerPublicacionesActivas())
    const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIALES)

    function actualizarFiltro<K extends keyof Filtros>(campo: K, valor: Filtros[K]) {
        setFiltros((prev) => ({ ...prev, [campo]: valor }))
    }

    const resultados = useMemo(
        () => publicaciones.filter((p) => coincideConFiltros(p, filtros)),
        [publicaciones, filtros],
    )

    return (
        <PublicoLayout>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-highlight px-6 py-8 sm:px-10 sm:py-10 mb-6 text-foreground">
                <Search className="absolute -right-4 -bottom-6 w-32 h-32 text-foreground/10" aria-hidden="true" />
                <h1 className="text-2xl sm:text-3xl font-heading font-bold">Encontrá tu próximo hogar</h1>
                <p className="text-sm sm:text-base text-foreground/75 mt-1.5 max-w-md">
                    Explorá publicaciones activas de propietarios e inmobiliarias y filtrá por lo que
                    más te importa.
                </p>
            </div>

            <div className="bg-surface rounded-2xl shadow-lg p-4 sm:p-5 mb-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                        Filtros de búsqueda
                    </h2>
                    <button
                        type="button"
                        onClick={() => setFiltros(FILTROS_INICIALES)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary transition-colors cursor-pointer"
                    >
                        <RotateCcw className="w-4 h-4" aria-hidden="true" />
                        Limpiar filtros
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                        <label className="block text-sm font-semibold text-foreground mb-1">Modalidad</label>
                        <select
                            value={filtros.modalidad}
                            onChange={(e) => actualizarFiltro('modalidad', e.target.value as Filtros['modalidad'])}
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
            </div>

            <p className="text-sm text-muted mb-4">
                {resultados.length === 0
                    ? 'No se encontraron publicaciones con esos filtros.'
                    : `${resultados.length} publicación(es) encontrada(s).`}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {resultados.map((publicacion) => {
                    const publicador = obtenerUsuarioPorId(publicacion.propietarioId)

                    return (
                        <Link
                            key={publicacion.id}
                            to={`/explorar/${publicacion.id}`}
                            className="bg-surface rounded-2xl shadow-lg overflow-hidden flex flex-col cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all"
                        >
                            <div className="h-40 bg-surface-hover flex items-center justify-center shrink-0">
                                {publicacion.fotos[0] ? (
                                    <img
                                        src={publicacion.fotos[0]}
                                        alt={publicacion.descripcion}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-xs text-muted">Sin foto</span>
                                )}
                            </div>
                            <div className="p-4 flex flex-col gap-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-primary-subtle text-primary capitalize">
                                        {publicacion.tipoInmueble}
                                    </span>
                                    <span className="text-xs text-muted capitalize">{publicacion.modalidad}</span>
                                </div>
                                <p className="text-foreground font-heading font-semibold">
                                    {formatearPrecio(publicacion.precio)}
                                </p>
                                <p className="text-sm text-muted line-clamp-2">{publicacion.descripcion}</p>
                                <p className="text-xs text-muted flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                    {publicacion.ubicacion}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-muted mt-1">
                                    <span className="flex items-center gap-1">
                                        <DoorOpen className="w-3.5 h-3.5" aria-hidden="true" />
                                        {publicacion.ambientes} amb.
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <BedDouble className="w-3.5 h-3.5" aria-hidden="true" />
                                        {publicacion.dormitorios} dorm.
                                    </span>
                                </div>
                                {publicador && (
                                    <p className="text-xs text-muted flex items-center gap-1 mt-1 pt-2 border-t border-border">
                                        <User className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                        {publicador.nombre} {publicador.apellido} ·{' '}
                                        {publicador.rol === 'inmobiliaria' ? 'Inmobiliaria' : 'Propietario'}
                                    </p>
                                )}
                            </div>
                        </Link>
                    )
                })}
            </div>
        </PublicoLayout>
    )
}

export default Explorar
