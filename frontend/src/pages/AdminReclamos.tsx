import { useState } from 'react'
import { Check, ChevronRight, Eye, Flag, Home, X } from 'lucide-react'
import PanelLayout from '../layouts/PanelLayout'
import PublicacionPreviewModal from '../components/PublicacionPreviewModal'
import ModalDetalleUsuario from '../components/ModalDetalleUsuario'
import { cambiarEstadoReclamo, listarReclamos, obtenerUsuarioAdministrado, type UsuarioAdministrado } from '../servicios/administracion'
import { obtenerPublicacion } from '../servicios/publicaciones'
import { mensajeDeError } from '../servicios/errores'
import { useConsulta } from '../hooks/useConsulta'
import { mostrarToast } from '../utils/toast'
import { ETIQUETAS_ESTADO_RECLAMO, ETIQUETAS_MOTIVO_RECLAMO, type EstadoReclamo, type Reclamo } from '../types/reclamo'
import { ETIQUETAS_ROL } from '../types/usuario'
import type { Anunciante, Publicacion } from '../types/publicacion'
import { formatearFechaHora, nombreDelAnunciante } from '../utils/formato'

type FiltroReclamo = 'todos' | EstadoReclamo

const PESTANAS_RECLAMOS: { valor: FiltroReclamo; etiqueta: string }[] = [
    { valor: 'pendiente', etiqueta: 'Pendientes' },
    { valor: 'en_revision', etiqueta: 'En revisión' },
    { valor: 'resuelto', etiqueta: 'Resueltos' },
    { valor: 'descartado', etiqueta: 'Descartados' },
    { valor: 'todos', etiqueta: 'Todos' },
]

const ESTADOS_ABIERTOS: EstadoReclamo[] = ['pendiente', 'en_revision']

function etiquetaObjetivoReclamo(reclamo: Reclamo) {
    return reclamo.objetivoTipo === 'publicacion' ? 'Publicación' : 'Usuario'
}

function Iniciales({ persona, clase }: { persona: Anunciante; clase: string }) {
    return (
        <span className={`inline-flex items-center justify-center rounded-full font-heading font-semibold shrink-0 ${clase}`}>
            {`${persona.nombre.charAt(0)}${persona.apellido.charAt(0)}`.toUpperCase()}
        </span>
    )
}

type VistaModal =
    | { tipo: 'reclamo' }
    | { tipo: 'publicacion'; publicacion: Publicacion }
    | { tipo: 'usuario'; usuario: UsuarioAdministrado }

// RF-18: detalle de un reclamo, con acceso a lo reportado y a quién lo reportó.
export function ModalDetalleReclamo({
    reclamo,
    onClose,
    onCambio,
}: {
    reclamo: Reclamo
    onClose: () => void
    onCambio: () => void
}) {
    const [nota, setNota] = useState('')
    const [vista, setVista] = useState<VistaModal>({ tipo: 'reclamo' })
    const [ocupado, setOcupado] = useState(false)
    const etiquetaEstado = ETIQUETAS_ESTADO_RECLAMO[reclamo.estado]
    const abierto = ESTADOS_ABIERTOS.includes(reclamo.estado)

    async function verPublicacion(id: string) {
        try {
            setVista({ tipo: 'publicacion', publicacion: await obtenerPublicacion(id) })
        } catch (error) {
            mostrarToast(mensajeDeError(error, 'No se pudo abrir la publicación.'), 'error')
        }
    }

    async function verUsuario(id: string) {
        try {
            setVista({ tipo: 'usuario', usuario: await obtenerUsuarioAdministrado(id) })
        } catch (error) {
            mostrarToast(mensajeDeError(error, 'No se pudo abrir el perfil.'), 'error')
        }
    }

    async function cambiarEstado(estado: EstadoReclamo) {
        setOcupado(true)
        try {
            await cambiarEstadoReclamo(reclamo.id, estado, nota.trim() || undefined)
            mostrarToast(
                estado === 'resuelto'
                    ? 'Reclamo resuelto. Le avisamos a quien lo reportó.'
                    : estado === 'descartado'
                        ? 'Reclamo descartado. Le avisamos a quien lo reportó.'
                        : 'Reclamo marcado en revisión.',
            )
            onCambio()
            onClose()
        } catch (error) {
            mostrarToast(mensajeDeError(error), 'error')
        } finally {
            setOcupado(false)
        }
    }

    if (vista.tipo === 'publicacion') {
        return (
            <PublicacionPreviewModal
                publicacion={vista.publicacion}
                permitirEditar={false}
                propietario={vista.publicacion.propietarioDetalle}
                onClose={() => setVista({ tipo: 'reclamo' })}
            />
        )
    }
    if (vista.tipo === 'usuario') {
        return <ModalDetalleUsuario usuario={vista.usuario} onClose={() => setVista({ tipo: 'reclamo' })} />
    }

    const { publicacionResumen, usuarioReportado, reclamante } = reclamo

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-overlay/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-surface rounded-2xl shadow-card w-full max-w-md p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Flag className="w-5 h-5 shrink-0 text-danger" aria-hidden="true" />
                        <h3 className="text-base font-heading font-semibold text-foreground">Detalle del reclamo</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-foreground hover:bg-surface-hover transition-colors cursor-pointer shrink-0"
                    >
                        <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${etiquetaEstado.clase}`}>{etiquetaEstado.texto}</span>
                    <span className="text-xs text-muted">{etiquetaObjetivoReclamo(reclamo)}</span>
                </div>
                <div>
                    <p className="text-sm font-semibold text-foreground">{ETIQUETAS_MOTIVO_RECLAMO[reclamo.motivo]}</p>
                    <p className="text-sm text-muted mt-1 whitespace-pre-line">{reclamo.descripcion}</p>
                </div>

                <div className="text-xs text-muted flex flex-col gap-0.5">
                    <p>Reportado el {formatearFechaHora(reclamo.creadoEn)}</p>
                    {!abierto && (
                        <p>
                            {reclamo.estado === 'resuelto' ? 'Resuelto' : 'Descartado'} el {formatearFechaHora(reclamo.actualizadoEn)}
                        </p>
                    )}
                </div>

                {publicacionResumen && (
                    <button
                        type="button"
                        onClick={() => verPublicacion(publicacionResumen.id)}
                        className="w-full flex items-center gap-3 rounded-lg border border-border p-2.5 hover:border-primary hover:bg-primary-subtle transition-colors cursor-pointer text-left"
                    >
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-hover flex items-center justify-center shrink-0">
                            {publicacionResumen.foto ? (
                                <img src={publicacionResumen.foto} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <Home className="w-5 h-5 text-muted" aria-hidden="true" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">{publicacionResumen.descripcion}</p>
                            <p className="text-xs text-muted truncate">{publicacionResumen.ubicacion}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
                    </button>
                )}
                {usuarioReportado && (
                    <button
                        type="button"
                        onClick={() => verUsuario(usuarioReportado.id)}
                        className="w-full flex items-center gap-3 rounded-lg border border-border p-2.5 hover:border-primary hover:bg-primary-subtle transition-colors cursor-pointer text-left"
                    >
                        <Iniciales persona={usuarioReportado} clase="w-10 h-10 bg-primary text-surface text-sm" />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">{nombreDelAnunciante(usuarioReportado)}</p>
                            <p className="text-xs text-muted truncate">{ETIQUETAS_ROL[usuarioReportado.rol]}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
                    </button>
                )}
                {reclamante && (
                    <button
                        type="button"
                        onClick={() => verUsuario(reclamante.id)}
                        className="w-full flex items-center gap-2.5 rounded-lg border border-dashed border-border p-2 hover:border-primary hover:bg-surface-hover transition-colors cursor-pointer text-left"
                    >
                        <Iniciales persona={reclamante} clase="w-7 h-7 bg-surface-hover text-muted text-xs" />
                        <p className="text-xs text-muted truncate flex-1">
                            Reportado por <span className="text-foreground font-semibold">{reclamante.nombre} {reclamante.apellido}</span>
                        </p>
                        <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0" aria-hidden="true" />
                    </button>
                )}

                {reclamo.notaAdmin && (
                    <p className="text-xs text-foreground bg-surface-hover rounded-lg px-3 py-2">Nota: {reclamo.notaAdmin}</p>
                )}

                {abierto && (
                    <div className="flex flex-col gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-1">
                                Nota para quien reportó (opcional)
                            </label>
                            <input
                                type="text"
                                value={nota}
                                onChange={(e) => setNota(e.target.value)}
                                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                            <button
                                type="button"
                                disabled={ocupado}
                                onClick={() => cambiarEstado('resuelto')}
                                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg py-2 px-5 bg-accent text-on-accent hover:opacity-90 transition-colors cursor-pointer disabled:opacity-60"
                            >
                                <Check className="w-4 h-4" aria-hidden="true" />
                                Resolver
                            </button>
                            {reclamo.estado === 'pendiente' && (
                                <button
                                    type="button"
                                    disabled={ocupado}
                                    onClick={() => cambiarEstado('en_revision')}
                                    className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg py-2 px-5 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer disabled:opacity-60"
                                >
                                    <Eye className="w-4 h-4" aria-hidden="true" />
                                    En revisión
                                </button>
                            )}
                            <button
                                type="button"
                                disabled={ocupado}
                                onClick={() => cambiarEstado('descartado')}
                                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg py-2 px-5 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer disabled:opacity-60"
                            >
                                <X className="w-4 h-4" aria-hidden="true" />
                                Descartar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function AdminReclamos() {
    const [filtro, setFiltro] = useState<FiltroReclamo>('pendiente')
    const [reclamoActivo, setReclamoActivo] = useState<Reclamo | null>(null)
    // Son pocos: se traen todos y se filtran acá para mostrar la cantidad de cada pestaña.
    const consulta = useConsulta('reclamos', listarReclamos)
    const reclamos = consulta.datos ?? []
    const reclamosFiltrados = filtro === 'todos' ? reclamos : reclamos.filter((r) => r.estado === filtro)

    return (
        <PanelLayout>
            <h1 className="flex items-center gap-2 text-lg sm:text-xl font-heading font-semibold text-foreground mb-1">
                <Flag className="w-5 h-5 text-primary" aria-hidden="true" />
                Reclamos
            </h1>
            <p className="text-sm text-muted mb-6">
                Reportes enviados por usuarios sobre publicaciones o sobre otros usuarios. Tocá un reclamo
                para ver el detalle completo.
            </p>

            <div className="bg-surface rounded-2xl shadow-card p-5">
                <div className="flex flex-wrap gap-2 mb-4">
                    {PESTANAS_RECLAMOS.map((pestana) => {
                        const cantidad =
                            pestana.valor === 'todos' ? reclamos.length : reclamos.filter((r) => r.estado === pestana.valor).length
                        return (
                            <button
                                key={pestana.valor}
                                type="button"
                                onClick={() => setFiltro(pestana.valor)}
                                className={`text-sm font-semibold rounded-full px-3 py-1.5 transition-colors cursor-pointer ${filtro === pestana.valor
                                    ? 'bg-primary text-surface'
                                    : 'bg-surface text-foreground border border-border hover:bg-primary-subtle'
                                    }`}
                            >
                                {pestana.etiqueta} <span className="opacity-80">{cantidad}</span>
                            </button>
                        )
                    })}
                </div>

                {consulta.cargando && reclamos.length === 0 ? (
                    <p className="text-sm text-muted">Cargando reclamos…</p>
                ) : consulta.error ? (
                    <p className="text-sm text-danger">{mensajeDeError(consulta.error, 'No se pudieron cargar los reclamos.')}</p>
                ) : reclamosFiltrados.length === 0 ? (
                    <p className="text-sm text-muted">No hay reclamos en este estado.</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {reclamosFiltrados.map((reclamo) => {
                            const etiquetaEstado = ETIQUETAS_ESTADO_RECLAMO[reclamo.estado]
                            return (
                                <button
                                    key={reclamo.id}
                                    type="button"
                                    onClick={() => setReclamoActivo(reclamo)}
                                    className="w-full text-left flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-surface-hover transition-colors cursor-pointer"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${etiquetaEstado.clase}`}>
                                                {etiquetaEstado.texto}
                                            </span>
                                            <span className="text-xs text-muted">{etiquetaObjetivoReclamo(reclamo)}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-foreground truncate">
                                            {ETIQUETAS_MOTIVO_RECLAMO[reclamo.motivo]} · {reclamo.nombreObjetivo}
                                        </p>
                                        <p className="text-xs text-muted truncate">
                                            Reportado por {reclamo.reclamante ? `${reclamo.reclamante.nombre} ${reclamo.reclamante.apellido}` : 'Usuario'}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {reclamoActivo && (
                <ModalDetalleReclamo reclamo={reclamoActivo} onClose={() => setReclamoActivo(null)} onCambio={consulta.recargar} />
            )}
        </PanelLayout>
    )
}

export default AdminReclamos
