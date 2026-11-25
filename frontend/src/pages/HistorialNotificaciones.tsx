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
    listarNotificaciones,
} from '../servicios/notificaciones'
import { mensajeDeError } from '../servicios/errores'
import { obtenerSesion } from '../servicios/sesion'
import { useConsulta } from '../hooks/useConsulta'
import { actualizarContadores } from '../hooks/useContador'
import { mostrarToast } from '../mocks/toast'
import { formatearFechaHora } from '../utils/formato'

const RESULTADOS_POR_PAGINA = 10

function HistorialNotificaciones() {
    const sesion = obtenerSesion()
    const [paginaActual, setPaginaActual] = useState(1)
    const [confirmarVaciado, setConfirmarVaciado] = useState(false)
    const consulta = useConsulta(String(paginaActual), () => listarNotificaciones(paginaActual))
    const notificaciones = consulta.datos?.results ?? []
    const refrescar = consulta.recargar

    if (!sesion) return null

    const Layout = sesion.rol === 'interesado' ? PublicoLayout : PanelLayout

    async function handleEliminar(id: string) {
        try {
            await eliminarNotificacion(id)
            mostrarToast('Notificación eliminada.')
            refrescar()
            actualizarContadores()
        } catch (error) {
            mostrarToast(mensajeDeError(error), 'error')
        }
    }

    async function handleVaciarHistorial() {
        setConfirmarVaciado(false)
        try {
            await eliminarTodasLasNotificaciones()
            mostrarToast('Historial de notificaciones vaciado.')
            setPaginaActual(1)
            refrescar()
            actualizarContadores()
        } catch (error) {
            mostrarToast(mensajeDeError(error), 'error')
        }
    }

    const totalPaginas = Math.max(1, Math.ceil((consulta.datos?.count ?? 0) / RESULTADOS_POR_PAGINA))

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

            {consulta.cargando && notificaciones.length === 0 ? (
                <div className="bg-surface rounded-2xl shadow-lg p-8 text-center text-sm text-muted">
                    Cargando notificaciones…
                </div>
            ) : consulta.error ? (
                <div className="bg-surface rounded-2xl shadow-lg p-8 text-center text-sm text-danger">
                    {mensajeDeError(consulta.error, 'No se pudieron cargar las notificaciones.')}
                </div>
            ) : notificaciones.length === 0 ? (
                <div className="bg-surface rounded-2xl shadow-lg p-8 text-center text-sm text-muted">
                    No tenés notificaciones todavía.
                </div>
            ) : (
                <div className="bg-surface rounded-2xl shadow-lg overflow-hidden">
                    {notificaciones.map((n) => {
                        const contenido = (
                            <>
                                {n.tipo === 'error' ? (
                                    <XCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" aria-hidden="true" />
                                ) : (
                                    <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-foreground">{n.mensaje}</p>
                                    <p className="text-xs text-muted mt-0.5">{formatearFechaHora(n.creadaEn)}</p>
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

            <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />

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
