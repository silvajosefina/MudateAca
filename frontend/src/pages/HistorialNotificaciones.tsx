import { useState } from 'react'
import { Link } from 'react-router'
import { Bell, CheckCircle2, Trash2, XCircle } from 'lucide-react'
import PublicoLayout from '../layouts/PublicoLayout'
import PanelLayout from '../layouts/PanelLayout'
import Paginacion from '../components/Paginacion'
import ConfirmDialog from '../components/ConfirmDialog'
import {
    eliminarNotificacion,
    eliminarTodasLasNotificaciones,
    obtenerNotificacionesDeUsuario,
    type Notificacion,
} from '../mocks/notificaciones'
import { obtenerSesion } from '../mocks/sesion'
import { mostrarToast } from '../mocks/toast'

const RESULTADOS_POR_PAGINA = 10

function formatearFecha(iso: string): string {
    return new Date(iso).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function HistorialNotificaciones() {
    const sesion = obtenerSesion()
    const [notificaciones, setNotificaciones] = useState<Notificacion[]>(() =>
        sesion ? obtenerNotificacionesDeUsuario(sesion.id) : [],
    )
    const [paginaActual, setPaginaActual] = useState(1)
    const [confirmarVaciado, setConfirmarVaciado] = useState(false)

    if (!sesion) return null

    const Layout = sesion.rol === 'interesado' ? PublicoLayout : PanelLayout

    function refrescar() {
        setNotificaciones(obtenerNotificacionesDeUsuario(sesion!.id))
    }

    function handleEliminar(id: string) {
        eliminarNotificacion(id)
        mostrarToast('Notificación eliminada.')
        refrescar()
    }

    function handleVaciarHistorial() {
        eliminarTodasLasNotificaciones(sesion!.id)
        mostrarToast('Historial de notificaciones vaciado.')
        setConfirmarVaciado(false)
        setPaginaActual(1)
        refrescar()
    }

    const totalPaginas = Math.max(1, Math.ceil(notificaciones.length / RESULTADOS_POR_PAGINA))
    const paginaSegura = Math.min(paginaActual, totalPaginas)
    const notificacionesPagina = notificaciones.slice(
        (paginaSegura - 1) * RESULTADOS_POR_PAGINA,
        paginaSegura * RESULTADOS_POR_PAGINA,
    )

    return (
        <Layout>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h1 className="flex items-center gap-2 text-lg sm:text-xl font-heading font-semibold text-foreground">
                    <Bell className="w-5 h-5 text-primary" aria-hidden="true" />
                    Historial de notificaciones
                </h1>
                {notificaciones.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setConfirmarVaciado(true)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-danger transition-colors cursor-pointer"
                    >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                        Vaciar historial
                    </button>
                )}
            </div>

            {notificaciones.length === 0 ? (
                <div className="bg-surface rounded-2xl shadow-lg p-8 text-center text-sm text-muted">
                    No tenés notificaciones todavía.
                </div>
            ) : (
                <div className="bg-surface rounded-2xl shadow-lg overflow-hidden">
                    {notificacionesPagina.map((n) => {
                        const contenido = (
                            <>
                                {n.tipo === 'error' ? (
                                    <XCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" aria-hidden="true" />
                                ) : (
                                    <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-foreground">{n.mensaje}</p>
                                    <p className="text-xs text-muted mt-0.5">{formatearFecha(n.creadaEn)}</p>
                                </div>
                            </>
                        )
                        return (
                            <div
                                key={n.id}
                                className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-b-0"
                            >
                                {n.enlace ? (
                                    <Link
                                        to={n.enlace}
                                        className="flex items-start gap-3 flex-1 min-w-0 rounded-lg -m-1 p-1 hover:bg-surface-hover transition-colors cursor-pointer"
                                    >
                                        {contenido}
                                    </Link>
                                ) : (
                                    <div className="flex items-start gap-3 flex-1 min-w-0">{contenido}</div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleEliminar(n.id)}
                                    aria-label="Eliminar notificación"
                                    title="Eliminar notificación"
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-full text-muted hover:text-danger hover:bg-danger-subtle transition-colors cursor-pointer shrink-0"
                                >
                                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}

            <Paginacion paginaActual={paginaSegura} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />

            {confirmarVaciado && (
                <ConfirmDialog
                    titulo="Vaciar historial"
                    mensaje="¿Eliminar todas tus notificaciones? Esta acción no se puede deshacer."
                    textoConfirmar="Vaciar historial"
                    peligroso
                    onConfirmar={handleVaciarHistorial}
                    onCancelar={() => setConfirmarVaciado(false)}
                />
            )}
        </Layout>
    )
}

export default HistorialNotificaciones
