import { useState } from 'react'
import { Link } from 'react-router'
import { KeyRound, LayoutGrid, List, Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import PanelLayout from '../layouts/PanelLayout'
import PublicacionPreviewModal from '../components/PublicacionPreviewModal'
import ConfirmDialog from '../components/ConfirmDialog'
import {
    cambiarEstadoPublicacion,
    eliminarPublicacion,
    obtenerPublicacionesDeUsuario,
} from '../mocks/publicaciones'
import { obtenerSesion } from '../mocks/sesion'
import { mostrarToast } from '../mocks/toast'
import type { EstadoPublicacion, Publicacion } from '../types/publicacion'

type Pestana = 'todas' | 'activa' | 'pausada' | 'observada' | 'alquilada' | 'archivada' | 'eliminada'
type Vista = 'lista' | 'grilla'

const PESTANAS: { valor: Pestana; etiqueta: string }[] = [
    { valor: 'todas', etiqueta: 'Todas' },
    { valor: 'activa', etiqueta: 'Activas' },
    { valor: 'pausada', etiqueta: 'Pausadas' },
    { valor: 'observada', etiqueta: 'Observadas' },
    { valor: 'alquilada', etiqueta: 'Alquiladas' },
    { valor: 'archivada', etiqueta: 'Archivadas' },
    { valor: 'eliminada', etiqueta: 'Eliminadas' },
]

const ETIQUETAS_ESTADO: Record<EstadoPublicacion, { texto: string; clase: string }> = {
    pendiente_moderacion: { texto: 'Pendiente de moderación', clase: 'bg-surface-hover text-muted' },
    activa: { texto: 'Activa', clase: 'bg-primary-subtle text-primary' },
    pausada: { texto: 'Pausada', clase: 'bg-warning-subtle text-warning' },
    observada: { texto: 'Observada', clase: 'bg-warning text-white' },
    reservada: { texto: 'Reservada', clase: 'bg-surface-hover text-foreground' },
    alquilada: { texto: 'Alquilada', clase: 'bg-primary text-white' },
    archivada: { texto: 'Archivada', clase: 'bg-surface-hover text-muted' },
    eliminada: { texto: 'Eliminada', clase: 'bg-danger-subtle text-danger' },
}

function formatearPrecio(valor: number) {
    return valor.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
}

function MisPublicaciones() {
    const sesion = obtenerSesion()
    const [pestana, setPestana] = useState<Pestana>('todas')
    const [vista, setVista] = useState<Vista>('lista')
    const [publicaciones, setPublicaciones] = useState<Publicacion[]>(() =>
        sesion ? obtenerPublicacionesDeUsuario(sesion.id) : [],
    )
    const [publicacionAVer, setPublicacionAVer] = useState<Publicacion | null>(null)
    const [publicacionAEliminar, setPublicacionAEliminar] = useState<Publicacion | null>(null)

    if (!sesion) return null

    function refrescar() {
        setPublicaciones(obtenerPublicacionesDeUsuario(sesion!.id))
    }

    function handlePausar(publicacion: Publicacion) {
        cambiarEstadoPublicacion(publicacion.id, sesion!.id, 'pausada')
        mostrarToast('Publicación pausada.')
        refrescar()
    }

    function handleReactivar(publicacion: Publicacion) {
        cambiarEstadoPublicacion(publicacion.id, sesion!.id, 'activa')
        mostrarToast('Publicación reactivada.')
        refrescar()
    }

    function handleMarcarAlquilada(publicacion: Publicacion) {
        cambiarEstadoPublicacion(publicacion.id, sesion!.id, 'alquilada')
        mostrarToast('Publicación marcada como alquilada.')
        refrescar()
    }

    function confirmarEliminar() {
        if (!publicacionAEliminar) return
        eliminarPublicacion(publicacionAEliminar.id, sesion!.id)
        setPublicacionAEliminar(null)
        mostrarToast('Publicación eliminada.')
        refrescar()
    }

    const listado = pestana === 'todas' ? publicaciones : publicaciones.filter((p) => p.estado === pestana)
    const etiquetaPestana = PESTANAS.find((p) => p.valor === pestana)?.etiqueta ?? ''

    return (
        <PanelLayout>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <h2 className="text-lg sm:text-xl font-heading font-semibold text-foreground">Mis publicaciones</h2>
                <Link
                    to="/publicaciones/nueva"
                    className="inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-white font-heading font-semibold rounded-lg px-4 py-2 text-center transition-colors cursor-pointer"
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
                            onClick={() => setPestana(p.valor)}
                            className={`text-sm font-semibold rounded-full px-3 py-1.5 transition-colors cursor-pointer ${pestana === p.valor
                                ? 'bg-primary text-white'
                                : 'bg-surface text-foreground border border-border hover:bg-primary-subtle'
                                }`}
                        >
                            {p.etiqueta}
                        </button>
                    ))}
                </div>

                <div className="flex gap-1 rounded-lg border border-border p-1 bg-surface shrink-0">
                    <button
                        type="button"
                        onClick={() => setVista('lista')}
                        aria-label="Ver como lista"
                        aria-pressed={vista === 'lista'}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors cursor-pointer ${vista === 'lista' ? 'bg-primary text-white' : 'text-muted hover:bg-surface-hover'
                            }`}
                    >
                        <List className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setVista('grilla')}
                        aria-label="Ver como grilla"
                        aria-pressed={vista === 'grilla'}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors cursor-pointer ${vista === 'grilla' ? 'bg-primary text-white' : 'text-muted hover:bg-surface-hover'
                            }`}
                    >
                        <LayoutGrid className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>
            </div>

            {listado.length === 0 ? (
                <div className="bg-surface rounded-2xl shadow-lg p-8 text-center text-sm text-muted">
                    No tenés publicaciones{pestana !== 'todas' && ` en estado "${etiquetaPestana.toLowerCase()}"`} todavía.
                </div>
            ) : (
                <div className={vista === 'grilla' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'flex flex-col gap-4'}>
                    {listado.map((publicacion) => {
                        const etiqueta = ETIQUETAS_ESTADO[publicacion.estado]
                        const eliminada = publicacion.estado === 'eliminada'
                        const alquilada = publicacion.estado === 'alquilada'
                        const enGrilla = vista === 'grilla'

                        return (
                            <div
                                key={publicacion.id}
                                className={`bg-surface rounded-2xl shadow-lg p-4 sm:p-5 flex gap-4 ${enGrilla ? 'flex-col' : 'flex-col sm:flex-row'
                                    }`}
                            >
                                <button
                                    type="button"
                                    disabled={eliminada}
                                    onClick={() => setPublicacionAVer(publicacion)}
                                    className={`flex gap-4 text-left flex-1 min-w-0 ${enGrilla ? 'flex-col' : 'flex-col sm:flex-row'
                                        } ${eliminada ? 'cursor-default' : 'cursor-pointer'}`}
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
                                            <span className="text-xs text-muted capitalize">{publicacion.tipoInmueble}</span>
                                        </div>
                                        <p className="text-foreground font-heading font-semibold">
                                            {formatearPrecio(publicacion.precio)}
                                        </p>
                                        <p className="text-sm text-muted line-clamp-2">{publicacion.descripcion}</p>
                                        <p className="text-xs text-muted">{publicacion.ubicacion}</p>
                                    </div>
                                </button>

                                <div
                                    className={`flex gap-2 flex-wrap shrink-0 ${enGrilla ? 'w-full' : 'sm:flex-col sm:w-48'
                                        }`}
                                >
                                    {!eliminada && !alquilada && (
                                        <Link
                                            to={`/publicaciones/${publicacion.id}/editar`}
                                            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm text-center font-semibold rounded-lg px-3 py-2 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                                        >
                                            <Pencil className="w-4 h-4 shrink-0" aria-hidden="true" />
                                            Editar
                                        </Link>
                                    )}

                                    {publicacion.estado === 'activa' && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => handlePausar(publicacion)}
                                                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-semibold rounded-lg px-3 py-2 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                                            >
                                                <Pause className="w-4 h-4 shrink-0" aria-hidden="true" />
                                                Pausar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleMarcarAlquilada(publicacion)}
                                                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-semibold rounded-lg px-3 py-2 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                                            >
                                                <KeyRound className="w-4 h-4 shrink-0" aria-hidden="true" />
                                                Marcar alquilada
                                            </button>
                                        </>
                                    )}

                                    {(publicacion.estado === 'pausada' || alquilada) && (
                                        <button
                                            type="button"
                                            onClick={() => handleReactivar(publicacion)}
                                            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-semibold rounded-lg px-3 py-2 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                                        >
                                            <Play className="w-4 h-4 shrink-0" aria-hidden="true" />
                                            Reactivar
                                        </button>
                                    )}

                                    {!eliminada && (
                                        <button
                                            type="button"
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
