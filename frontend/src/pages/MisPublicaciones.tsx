import { useState } from 'react'
import { Link } from 'react-router'
import { Bookmark, KeyRound, LayoutGrid, List, Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import PanelLayout from '../layouts/PanelLayout'
import PublicacionPreviewModal from '../components/PublicacionPreviewModal'
import ConfirmDialog from '../components/ConfirmDialog'
import Paginacion from '../components/Paginacion'
import { aplicarAccion, eliminarPublicacion, listarMisPublicaciones } from '../servicios/publicaciones'
import { mensajeDeError } from '../servicios/errores'
import { useConsulta } from '../hooks/useConsulta'
import { guardarVistaListado, obtenerVistaListado } from '../utils/preferenciasVista'
import { obtenerSesion } from '../servicios/sesion'
import { mostrarToast } from '../utils/toast'
import { formatearPrecio } from '../utils/formato'
import { etiquetaNotaModeracion } from '../utils/moderacion'
import {
    ETIQUETAS_ESTADO_PUBLICACION,
    ETIQUETAS_TIPO_INMUEBLE,
    type AccionPublicacion,
    type EstadoPublicacion,
    type Publicacion,
} from '../types/publicacion'

type Pestana = 'todas' | 'en_revision' | Exclude<EstadoPublicacion, 'pendiente_moderacion'>

const PUBLICACIONES_POR_PAGINA = 6

const PESTANAS: { valor: Pestana; etiqueta: string }[] = [
    { valor: 'todas', etiqueta: 'Todas' },
    { valor: 'en_revision', etiqueta: 'En revisión' },
    { valor: 'activa', etiqueta: 'Activas' },
    { valor: 'pausada', etiqueta: 'Pausadas' },
    { valor: 'observada', etiqueta: 'Observadas' },
    { valor: 'reservada', etiqueta: 'Reservadas' },
    { valor: 'rechazada', etiqueta: 'Rechazadas' },
    { valor: 'alquilada', etiqueta: 'Alquiladas' },
    { valor: 'archivada', etiqueta: 'Archivadas' },
    { valor: 'oculta', etiqueta: 'Ocultas' },
    { valor: 'eliminada', etiqueta: 'Eliminadas' },
]

const MENSAJE_POR_ACCION: Partial<Record<AccionPublicacion, string>> = {
    pausar: 'Publicación pausada.',
    reactivar: 'Publicación reactivada.',
    reservar: 'Publicación marcada como reservada.',
    marcar_alquilada: 'Publicación marcada como alquilada. Se archivará sola a los 7 días.',
}

const BOTONES_DE_ACCION: { accion: AccionPublicacion; texto: string; Icono: typeof Pause }[] = [
    { accion: 'pausar', texto: 'Pausar', Icono: Pause },
    { accion: 'reservar', texto: 'Marcar reservada', Icono: Bookmark },
    { accion: 'marcar_alquilada', texto: 'Marcar alquilada', Icono: KeyRound },
    { accion: 'reactivar', texto: 'Reactivar', Icono: Play },
]

function estadoDeLaPestana(pestana: Pestana): EstadoPublicacion | null {
    if (pestana === 'todas') return null
    return pestana === 'en_revision' ? 'pendiente_moderacion' : pestana
}

function MisPublicaciones() {
    const sesion = obtenerSesion()
    const [pestana, setPestana] = useState<Pestana>('todas')
    const [vista, setVista] = useState(() => obtenerVistaListado())
    const [publicacionAVer, setPublicacionAVer] = useState<Publicacion | null>(null)
    const [publicacionAEliminar, setPublicacionAEliminar] = useState<Publicacion | null>(null)
    const [paginaActual, setPaginaActual] = useState(1)
    const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null)

    const consulta = useConsulta(`${pestana}-${paginaActual}`, () =>
        listarMisPublicaciones(estadoDeLaPestana(pestana), paginaActual),
    )
    const cargando = consulta.cargando
    const cargar = consulta.recargar
    const errorCarga = consulta.error ? mensajeDeError(consulta.error, 'No se pudieron cargar tus publicaciones.') : ''
    const listado: Publicacion[] = consulta.datos?.results ?? []
    const totalListado = consulta.datos?.count ?? 0
    const totales: Partial<Record<EstadoPublicacion, number>> = consulta.datos?.totales ?? {}

    if (!sesion) return null

    async function handleAccion(publicacion: Publicacion, accion: AccionPublicacion) {
        setAccionEnCurso(publicacion.id)
        try {
            await aplicarAccion(publicacion.id, accion)
            mostrarToast(MENSAJE_POR_ACCION[accion] ?? 'Publicación actualizada.')
            cargar()
        } catch (error) {
            mostrarToast(mensajeDeError(error), 'error')
        } finally {
            setAccionEnCurso(null)
        }
    }

    async function confirmarEliminar() {
        if (!publicacionAEliminar) return
        const aEliminar = publicacionAEliminar
        setPublicacionAEliminar(null)
        try {
            await eliminarPublicacion(aEliminar.id)
            mostrarToast('Publicación eliminada.')
            cargar()
        } catch (error) {
            mostrarToast(mensajeDeError(error), 'error')
        }
    }

    function cantidadDeLaPestana(valor: Pestana) {
        const estado = estadoDeLaPestana(valor)
        if (estado === null) return Object.values(totales).reduce((suma, n) => suma + (n ?? 0), 0)
        return totales[estado] ?? 0
    }

    const etiquetaPestana = PESTANAS.find((p) => p.valor === pestana)?.etiqueta ?? ''
    const totalPaginas = Math.max(1, Math.ceil(totalListado / PUBLICACIONES_POR_PAGINA))

    return (
        <PanelLayout>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <h2 className="text-lg sm:text-xl font-heading font-semibold text-foreground">Mis publicaciones</h2>
                <Link
                    to="/publicaciones/nueva"
                    className="inline-flex items-center justify-center gap-1.5 bg-[var(--color-action-strong)] hover:bg-[var(--color-action-strong-hover)] text-surface font-heading font-semibold rounded-lg px-4 py-2 text-center transition-colors cursor-pointer"
                >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    Nueva publicación
                </Link>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                <div className="flex flex-wrap gap-2">
                    {PESTANAS.map((p) => (
                        <button
                            key={p.valor}
                            type="button"
                            onClick={() => {
                                setPestana(p.valor)
                                setPaginaActual(1)
                            }}
                            className={`text-sm font-semibold rounded-full px-3 py-1.5 transition-colors cursor-pointer ${pestana === p.valor
                                ? 'bg-primary text-surface'
                                : 'bg-surface text-foreground border border-border hover:bg-primary-subtle'
                                }`}
                        >
                            {p.etiqueta} ({cantidadDeLaPestana(p.valor)})
                        </button>
                    ))}
                </div>

                <div className="flex gap-1 rounded-lg border border-border p-1 bg-surface shrink-0">
                    <button
                        type="button"
                        onClick={() => {
                            setVista('lista')
                            guardarVistaListado('lista')
                        }}
                        aria-label="Ver como lista"
                        aria-pressed={vista === 'lista'}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors cursor-pointer ${vista === 'lista' ? 'bg-primary text-surface' : 'text-muted hover:bg-surface-hover'
                            }`}
                    >
                        <List className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setVista('grilla')
                            guardarVistaListado('grilla')
                        }}
                        aria-label="Ver como grilla"
                        aria-pressed={vista === 'grilla'}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors cursor-pointer ${vista === 'grilla' ? 'bg-primary text-surface' : 'text-muted hover:bg-surface-hover'
                            }`}
                    >
                        <LayoutGrid className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>
            </div>

            {cargando && listado.length === 0 ? (
                <div className="bg-surface rounded-2xl shadow-lg p-8 text-center text-sm text-muted">
                    Cargando tus publicaciones…
                </div>
            ) : errorCarga ? (
                <div className="bg-surface rounded-2xl shadow-lg p-8 text-center text-sm text-danger">{errorCarga}</div>
            ) : listado.length === 0 ? (
                <div className="bg-surface rounded-2xl shadow-lg p-8 text-center text-sm text-muted">
                    No tenés publicaciones{pestana !== 'todas' && ` en estado "${etiquetaPestana.toLowerCase()}"`} todavía.
                </div>
            ) : (
                <div className={vista === 'grilla' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'flex flex-col gap-4'}>
                    {listado.map((publicacion) => {
                        const etiqueta = ETIQUETAS_ESTADO_PUBLICACION[publicacion.estado]
                        const acciones = publicacion.acciones ?? []
                        const ocupada = accionEnCurso === publicacion.id
                        const enGrilla = vista === 'grilla'

                        return (
                            <div
                                key={publicacion.id}
                                className={`bg-surface rounded-2xl shadow-lg p-4 sm:p-5 flex gap-4 ${enGrilla ? 'flex-col' : 'flex-col sm:flex-row'
                                    }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => setPublicacionAVer(publicacion)}
                                    className={`flex gap-4 text-left flex-1 min-w-0 cursor-pointer ${enGrilla ? 'flex-col' : 'flex-col sm:flex-row'
                                        }`}
                                >
                                    <div
                                        className={`rounded-lg overflow-hidden bg-surface-hover flex items-center justify-center shrink-0 ${enGrilla ? 'w-full h-40' : 'w-full sm:w-32 h-32'
                                            }`}
                                    >
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

                                    <div className="flex-1 flex flex-col gap-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${etiqueta.clase}`}>
                                                {etiqueta.texto}
                                            </span>
                                            <span className="text-xs text-muted">{ETIQUETAS_TIPO_INMUEBLE[publicacion.tipoInmueble]}</span>
                                        </div>
                                        <p className="text-foreground font-heading font-semibold">
                                            {formatearPrecio(publicacion.precio)}
                                        </p>
                                        <p className="text-sm text-muted line-clamp-2 whitespace-pre-line">{publicacion.descripcion}</p>
                                        <p className="text-xs text-muted">{publicacion.ubicacion}</p>
                                        {publicacion.estado === 'rechazada' && publicacion.motivoRechazoVerificacion && (
                                            <p className="text-xs text-danger bg-danger-subtle border border-danger/20 rounded-lg px-2 py-1 mt-1">
                                                Motivo del rechazo: {publicacion.motivoRechazoVerificacion}
                                            </p>
                                        )}
                                        {publicacion.estado === 'observada' && publicacion.notaModeracion && (
                                            <p className="text-xs text-warning bg-warning-subtle border border-warning/20 rounded-lg px-2 py-1 mt-1">
                                                {etiquetaNotaModeracion(publicacion)}: {publicacion.notaModeracion}
                                            </p>
                                        )}
                                        {publicacion.estado === 'oculta' && publicacion.motivoOcultamiento && (
                                            <p className="text-xs text-danger bg-danger-subtle border border-danger/20 rounded-lg px-2 py-1 mt-1">
                                                Ocultada por la administración: {publicacion.motivoOcultamiento}
                                            </p>
                                        )}
                                    </div>
                                </button>

                                <div
                                    className={`flex gap-2 flex-wrap shrink-0 ${enGrilla ? 'w-full' : 'sm:flex-col sm:w-48'
                                        }`}
                                >
                                    {acciones.includes('editar') && (
                                        <Link
                                            to={`/publicaciones/${publicacion.id}/editar`}
                                            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm text-center font-semibold rounded-lg px-3 py-2 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                                        >
                                            <Pencil className="w-4 h-4 shrink-0" aria-hidden="true" />
                                            Editar
                                        </Link>
                                    )}

                                    {BOTONES_DE_ACCION.filter(({ accion }) => acciones.includes(accion)).map(
                                        ({ accion, texto, Icono }) => (
                                            <button
                                                key={accion}
                                                type="button"
                                                disabled={ocupada}
                                                onClick={() => handleAccion(publicacion, accion)}
                                                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-semibold rounded-lg px-3 py-2 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                                            >
                                                <Icono className="w-4 h-4 shrink-0" aria-hidden="true" />
                                                {texto}
                                            </button>
                                        ),
                                    )}

                                    {acciones.includes('eliminar') && (
                                        <button
                                            type="button"
                                            disabled={ocupada}
                                            onClick={() => setPublicacionAEliminar(publicacion)}
                                            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-semibold rounded-lg px-3 py-2 border border-danger text-danger hover:bg-danger hover:text-white transition-colors cursor-pointer"
                                        >
                                            <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                                            Eliminar
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />

            {publicacionAVer && (
                <PublicacionPreviewModal
                    publicacion={publicacionAVer}
                    onClose={() => setPublicacionAVer(null)}
                />
            )}

            {publicacionAEliminar && (
                <ConfirmDialog
                    titulo="Eliminar publicación"
                    mensaje="¿Eliminar esta publicación? Dejará de estar disponible públicamente."
                    textoConfirmar="Eliminar"
                    peligroso
                    onConfirmar={confirmarEliminar}
                    onCancelar={() => setPublicacionAEliminar(null)}
                />
            )}
        </PanelLayout>
    )
}

export default MisPublicaciones
