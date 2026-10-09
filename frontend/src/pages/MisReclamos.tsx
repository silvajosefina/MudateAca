import { useState } from 'react'
import { ChevronRight, Flag, X } from 'lucide-react'
import PublicoLayout from '../layouts/PublicoLayout'
import PanelLayout from '../layouts/PanelLayout'
import { obtenerNombreObjetivoReclamo, obtenerReclamosPorUsuario } from '../mocks/reclamos'
import { obtenerSesion } from '../mocks/sesion'
import { ETIQUETAS_ESTADO_RECLAMO, ETIQUETAS_MOTIVO_RECLAMO, type Reclamo } from '../types/reclamo'

function ModalDetalleMiReclamo({ reclamo, onClose }: { reclamo: Reclamo; onClose: () => void }) {
    const etiquetaEstado = ETIQUETAS_ESTADO_RECLAMO[reclamo.estado]
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
                    <span className="text-xs text-muted">
                        {reclamo.objetivoTipo === 'publicacion' ? 'Publicación' : 'Usuario'}
                    </span>
                </div>
                <div>
                    <p className="text-sm font-semibold text-foreground">
                        {ETIQUETAS_MOTIVO_RECLAMO[reclamo.motivo]} · {obtenerNombreObjetivoReclamo(reclamo)}
                    </p>
                    <p className="text-sm text-muted mt-1">{reclamo.descripcion}</p>
                </div>

                {reclamo.notaAdmin && (
                    <p className="text-xs text-foreground bg-surface-hover rounded-lg px-3 py-2">
                        Respuesta de administración: {reclamo.notaAdmin}
                    </p>
                )}
            </div>
        </div>
    )
}

function MisReclamos() {
    const sesion = obtenerSesion()
    const [reclamoActivo, setReclamoActivo] = useState<Reclamo | null>(null)

    if (!sesion) return null

    const Layout = sesion.rol === 'interesado' ? PublicoLayout : PanelLayout
    const misReclamos = obtenerReclamosPorUsuario(sesion.id)

    return (
        <Layout>
            <h1 className="flex items-center gap-2 text-lg sm:text-xl font-heading font-semibold text-foreground mb-6">
                <Flag className="w-5 h-5 text-primary" aria-hidden="true" />
                Mis reclamos
            </h1>

            <div className="bg-surface rounded-2xl shadow-lg p-6 max-w-md">
                {misReclamos.length === 0 ? (
                    <p className="text-sm text-muted">No presentaste ningún reclamo todavía.</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {misReclamos.map((reclamo) => {
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
                                            <span className="text-xs text-muted">
                                                {reclamo.objetivoTipo === 'publicacion' ? 'Publicación' : 'Usuario'}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold text-foreground truncate">
                                            {ETIQUETAS_MOTIVO_RECLAMO[reclamo.motivo]} · {obtenerNombreObjetivoReclamo(reclamo)}
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
                <ModalDetalleMiReclamo reclamo={reclamoActivo} onClose={() => setReclamoActivo(null)} />
            )}
        </Layout>
    )
}

export default MisReclamos
