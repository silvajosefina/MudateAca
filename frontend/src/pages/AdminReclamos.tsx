import { useState } from 'react'
import { Check, ChevronRight, Flag, Home, X } from 'lucide-react'
import PanelLayout from '../layouts/PanelLayout'
import PublicacionPreviewModal from '../components/PublicacionPreviewModal'
import ModalDetalleUsuario from '../components/ModalDetalleUsuario'
import {
    descartarReclamo,
    obtenerEtiquetaObjetivoReclamo,
    obtenerNombreObjetivoReclamo,
    obtenerTodosLosReclamos,
    resolverReclamo,
} from '../mocks/reclamos'
import { obtenerPublicacionPorId } from '../mocks/publicaciones'
import { obtenerUsuarioPorId } from '../mocks/usuarios'
import { mostrarToast } from '../mocks/toast'
import { ETIQUETAS_ESTADO_RECLAMO, ETIQUETAS_MOTIVO_RECLAMO, type EstadoReclamo, type Reclamo } from '../types/reclamo'
import { ETIQUETAS_ROL, type Usuario } from '../types/usuario'
import type { Publicacion } from '../types/publicacion'

type FiltroReclamo = 'todos' | EstadoReclamo

const PESTANAS_RECLAMOS: { valor: FiltroReclamo; etiqueta: string }[] = [
    { valor: 'pendiente', etiqueta: 'Pendientes' },
    { valor: 'resuelto', etiqueta: 'Resueltos' },
    { valor: 'descartado', etiqueta: 'Descartados' },
    { valor: 'todos', etiqueta: 'Todos' },
]

function TarjetaObjetivo({
    publicacion,
    usuario,
    onClick,
}: {
    publicacion?: Publicacion
    usuario?: Usuario
    onClick: () => void
}) {
    if (publicacion) {
        return (
            <button
                type="button"
                onClick={onClick}
                className="w-full flex items-center gap-3 rounded-lg border border-border p-2.5 hover:border-primary hover:bg-primary-subtle transition-colors cursor-pointer text-left"
            >
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-hover flex items-center justify-center shrink-0">
                    {publicacion.fotos[0] ? (
                        <img src={publicacion.fotos[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <Home className="w-5 h-5 text-muted" aria-hidden="true" />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{publicacion.descripcion}</p>
                    <p className="text-xs text-muted truncate">{publicacion.ubicacion}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
            </button>
        )
    }
    if (usuario) {
        const iniciales = `${usuario.nombre.charAt(0)}${usuario.apellido.charAt(0)}`.toUpperCase()
        return (
            <button
                type="button"
                onClick={onClick}
                className="w-full flex items-center gap-3 rounded-lg border border-border p-2.5 hover:border-primary hover:bg-primary-subtle transition-colors cursor-pointer text-left"
            >
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-surface font-heading font-semibold text-sm shrink-0">
                    {iniciales}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                        {usuario.nombre} {usuario.apellido}
                    </p>
                    <p className="text-xs text-muted truncate">{ETIQUETAS_ROL[usuario.rol]} · {usuario.correo}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
            </button>
        )
    }
    return null
}

function TarjetaReclamante({ usuario, onClick }: { usuario: Usuario; onClick: () => void }) {
    const iniciales = `${usuario.nombre.charAt(0)}${usuario.apellido.charAt(0)}`.toUpperCase()
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full flex items-center gap-2.5 rounded-lg border border-dashed border-border p-2 hover:border-primary hover:bg-surface-hover transition-colors cursor-pointer text-left"
        >
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-surface-hover text-muted font-heading font-semibold text-xs shrink-0">
                {iniciales}
            </span>
            <p className="text-xs text-muted truncate flex-1">
                Reportado por <span className="text-foreground font-semibold">{usuario.nombre} {usuario.apellido}</span>
            </p>
            <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0" aria-hidden="true" />
        </button>
    )
}

type VistaModalReclamo = 'reclamo' | 'objetivo' | 'reclamante'

export function ModalDetalleReclamo({
    reclamo,
    onClose,
    onResolver,
    onDescartar,
}: {
    reclamo: Reclamo
    onClose: () => void
    onResolver: (nota: string) => void
    onDescartar: (nota: string) => void
}) {
    const [nota, setNota] = useState('')
    const [vista, setVista] = useState<VistaModalReclamo>('reclamo')
    const reclamante = obtenerUsuarioPorId(reclamo.reclamanteId)
    const etiquetaEstado = ETIQUETAS_ESTADO_RECLAMO[reclamo.estado]
    const etiquetaObjetivo = obtenerEtiquetaObjetivoReclamo(reclamo)

    const publicacionObjetivo = reclamo.objetivoTipo === 'publicacion' ? obtenerPublicacionPorId(reclamo.objetivoId) : undefined
    const usuarioObjetivo = reclamo.objetivoTipo === 'usuario' ? obtenerUsuarioPorId(reclamo.objetivoId) : undefined

    if (vista === 'objetivo' && publicacionObjetivo) {
        return (
            <PublicacionPreviewModal publicacion={publicacionObjetivo} permitirEditar={false} onClose={() => setVista('reclamo')} />
        )
    }
    if (vista === 'objetivo' && usuarioObjetivo) {
        return <ModalDetalleUsuario usuario={usuarioObjetivo} onClose={() => setVista('reclamo')} />
    }
    if (vista === 'reclamante' && reclamante) {
        return <ModalDetalleUsuario usuario={reclamante} onClose={() => setVista('reclamo')} />
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-overlay/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-surface rounded-2xl shadow-card w-full max-w-md p-6 flex flex-col gap-4"
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
                    <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${etiquetaEstado.clase}`}>
                        {etiquetaEstado.texto}
                    </span>
                    <span className="text-xs text-muted">{etiquetaObjetivo}</span>
                </div>
                <div>
                    <p className="text-sm font-semibold text-foreground">{ETIQUETAS_MOTIVO_RECLAMO[reclamo.motivo]}</p>
                    <p className="text-sm text-muted mt-1">{reclamo.descripcion}</p>
                </div>

                {(publicacionObjetivo || usuarioObjetivo) && (
                    <TarjetaObjetivo
                        publicacion={publicacionObjetivo}
                        usuario={usuarioObjetivo}
                        onClick={() => setVista('objetivo')}
                    />
                )}
                {reclamante && <TarjetaReclamante usuario={reclamante} onClick={() => setVista('reclamante')} />}

                {reclamo.notaAdmin && (
                    <p className="text-xs text-foreground bg-surface-hover rounded-lg px-3 py-2">
                        Nota: {reclamo.notaAdmin}
                    </p>
                )}

                {reclamo.estado === 'pendiente' && (
                    <div className="flex flex-col gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-1">Nota interna (opcional)</label>
                            <input
                                type="text"
                                value={nota}
                                onChange={(e) => setNota(e.target.value)}
                                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                type="button"
                                onClick={() => onResolver(nota)}
                                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg py-2 px-6 bg-accent text-on-accent hover:opacity-90 transition-colors cursor-pointer"
                            >
                                <Check className="w-4 h-4" aria-hidden="true" />
                                Resolver
                            </button>
                            <button
                                type="button"
                                onClick={() => onDescartar(nota)}
                                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg py-2 px-6 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
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
    const [reclamos, setReclamos] = useState<Reclamo[]>(() => obtenerTodosLosReclamos())
    const [filtro, setFiltro] = useState<FiltroReclamo>('pendiente')
    const [reclamoActivo, setReclamoActivo] = useState<Reclamo | null>(null)

    function refrescar() {
        setReclamos(obtenerTodosLosReclamos())
    }

    const reclamosFiltrados = filtro === 'todos' ? reclamos : reclamos.filter((r) => r.estado === filtro)

    function handleResolver(nota: string) {
        if (!reclamoActivo) return
        resolverReclamo(reclamoActivo.id, nota)
        mostrarToast('Reclamo marcado como resuelto.')
        setReclamoActivo(null)
        refrescar()
    }

    function handleDescartar(nota: string) {
        if (!reclamoActivo) return
        descartarReclamo(reclamoActivo.id, nota)
        mostrarToast('Reclamo descartado.')
        setReclamoActivo(null)
        refrescar()
    }

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
                            pestana.valor === 'todos'
                                ? reclamos.length
                                : reclamos.filter((r) => r.estado === pestana.valor).length
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

                {reclamosFiltrados.length === 0 ? (
                    <p className="text-sm text-muted">No hay reclamos en este estado.</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {reclamosFiltrados.map((reclamo) => {
                            const reclamante = obtenerUsuarioPorId(reclamo.reclamanteId)
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
                                            <span className="text-xs text-muted">{obtenerEtiquetaObjetivoReclamo(reclamo)}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-foreground truncate">
                                            {ETIQUETAS_MOTIVO_RECLAMO[reclamo.motivo]} · {obtenerNombreObjetivoReclamo(reclamo)}
                                        </p>
                                        <p className="text-xs text-muted truncate">
                                            Reportado por {reclamante ? `${reclamante.nombre} ${reclamante.apellido}` : 'Usuario'}
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
                <ModalDetalleReclamo
                    reclamo={reclamoActivo}
                    onClose={() => setReclamoActivo(null)}
                    onResolver={handleResolver}
                    onDescartar={handleDescartar}
                />
            )}
        </PanelLayout>
    )
}

export default AdminReclamos
