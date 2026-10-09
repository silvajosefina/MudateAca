import { useState } from 'react'
import { Link } from 'react-router'
import { Ban, Building2, Check, FileText, Flag, ShieldCheck, Users, X } from 'lucide-react'
import PanelLayout from '../layouts/PanelLayout'
import DialogoConMotivo from '../components/DialogoConMotivo'
import type { SolicitudConMotivo } from '../types/accionAdmin'
import { ModalDetalleReclamo } from './AdminReclamos'
import {
    aprobarVerificacionPublicacion,
    obtenerPublicacionesEnRevision,
    ocultarPublicacion,
    rechazarVerificacionPublicacion,
    solicitarModificacionesPublicacion,
} from '../mocks/publicaciones'
import {
    actualizarEstadoVerificacionUsuario,
    obtenerInmobiliariasPendientes,
    obtenerTodosLosUsuarios,
} from '../mocks/usuarios'
import { descartarReclamo, obtenerNombreObjetivoReclamo, obtenerReclamosPendientes, resolverReclamo } from '../mocks/reclamos'
import { mostrarToast } from '../mocks/toast'
import { ETIQUETAS_ESTADO_PUBLICACION, type Publicacion } from '../types/publicacion'
import { ETIQUETAS_ESTADO_RECLAMO, ETIQUETAS_MOTIVO_RECLAMO, type Reclamo } from '../types/reclamo'
import type { Usuario } from '../types/usuario'

const LIMITE_CONDENSADO = 5

function PanelAdministracion() {
    const [inmobiliarias, setInmobiliarias] = useState<Usuario[]>(() => obtenerInmobiliariasPendientes())
    const [publicacionesEnRevision, setPublicacionesEnRevision] = useState<Publicacion[]>(() => obtenerPublicacionesEnRevision())
    const [reclamosPendientes, setReclamosPendientes] = useState<Reclamo[]>(() => obtenerReclamosPendientes())
    const [usuarios, setUsuarios] = useState<Usuario[]>(() => obtenerTodosLosUsuarios())
    const [solicitud, setSolicitud] = useState<SolicitudConMotivo | null>(null)
    const [reclamoActivo, setReclamoActivo] = useState<Reclamo | null>(null)

    function refrescar() {
        setInmobiliarias(obtenerInmobiliariasPendientes())
        setPublicacionesEnRevision(obtenerPublicacionesEnRevision())
        setReclamosPendientes(obtenerReclamosPendientes())
        setUsuarios(obtenerTodosLosUsuarios())
    }

    const usuariosSuspendidos = usuarios.filter((u) => u.rol !== 'administrador' && u.estadoCuenta === 'suspendido')

    function handleAprobarInmobiliaria(usuario: Usuario) {
        actualizarEstadoVerificacionUsuario(usuario.id, 'verificado')
        mostrarToast(`${usuario.nombre} ${usuario.apellido} fue verificada.`)
        refrescar()
    }

    function handleAprobarPublicacion(publicacion: Publicacion) {
        aprobarVerificacionPublicacion(publicacion.id)
        mostrarToast('Publicación verificada y activada.')
        refrescar()
    }

    function confirmarSolicitud(motivo: string) {
        if (!solicitud) return
        switch (solicitud.accion) {
            case 'rechazar_inmobiliaria':
                actualizarEstadoVerificacionUsuario(solicitud.id, 'rechazado', motivo)
                mostrarToast('Rechazo registrado.', 'error')
                break
            case 'rechazar_publicacion':
                rechazarVerificacionPublicacion(solicitud.id, motivo)
                mostrarToast('Rechazo registrado.', 'error')
                break
            case 'solicitar_modificaciones':
                solicitarModificacionesPublicacion(solicitud.id, motivo)
                mostrarToast('Se solicitaron modificaciones al propietario.')
                break
            case 'ocultar_publicacion':
                ocultarPublicacion(solicitud.id, motivo)
                mostrarToast('Publicación ocultada.', 'error')
                break
        }
        setSolicitud(null)
        refrescar()
    }

    function handleResolverReclamo(nota: string) {
        if (!reclamoActivo) return
        resolverReclamo(reclamoActivo.id, nota)
        mostrarToast('Reclamo marcado como resuelto.')
        setReclamoActivo(null)
        refrescar()
    }

    function handleDescartarReclamo(nota: string) {
        if (!reclamoActivo) return
        descartarReclamo(reclamoActivo.id, nota)
        mostrarToast('Reclamo descartado.')
        setReclamoActivo(null)
        refrescar()
    }

    return (
        <PanelLayout>
            <h1 className="flex items-center gap-2 text-lg sm:text-xl font-heading font-semibold text-foreground mb-6">
                <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
                Panel de administración
            </h1>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-surface rounded-2xl shadow-card p-5 flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-warning-subtle text-warning shrink-0">
                        <Building2 className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <div>
                        <p className="text-2xl font-heading font-semibold text-foreground">{inmobiliarias.length}</p>
                        <p className="text-xs text-muted">Inmobiliarias pendientes</p>
                    </div>
                </div>
                <div className="bg-surface rounded-2xl shadow-card p-5 flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-warning-subtle text-warning shrink-0">
                        <FileText className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <div>
                        <p className="text-2xl font-heading font-semibold text-foreground">{publicacionesEnRevision.length}</p>
                        <p className="text-xs text-muted">Publicaciones en revisión</p>
                    </div>
                </div>
                <div className="bg-surface rounded-2xl shadow-card p-5 flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-warning-subtle text-warning shrink-0">
                        <Flag className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <div>
                        <p className="text-2xl font-heading font-semibold text-foreground">{reclamosPendientes.length}</p>
                        <p className="text-xs text-muted">Reclamos pendientes</p>
                    </div>
                </div>
                <div className="bg-surface rounded-2xl shadow-card p-5 flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-danger-subtle text-danger shrink-0">
                        <Users className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <div>
                        <p className="text-2xl font-heading font-semibold text-foreground">{usuariosSuspendidos.length}</p>
                        <p className="text-xs text-muted">Usuarios suspendidos</p>
                    </div>
                </div>
            </div>

            <div className="bg-surface rounded-2xl shadow-card p-5 mb-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                    <h2 className="flex items-center gap-1.5 font-heading font-semibold text-foreground">
                        <Building2 className="w-4 h-4 text-primary" aria-hidden="true" />
                        Inmobiliarias pendientes de verificación
                    </h2>
                    <Link to="/panel-administracion/usuarios" className="text-sm font-semibold text-primary hover:underline shrink-0">
                        Ver todo
                    </Link>
                </div>
                {inmobiliarias.length === 0 ? (
                    <p className="text-sm text-muted">No hay inmobiliarias esperando verificación.</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {inmobiliarias.slice(0, LIMITE_CONDENSADO).map((usuario) => (
                            <div
                                key={usuario.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-3"
                            >
                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        {usuario.nombre} {usuario.apellido}
                                    </p>
                                    <p className="text-xs text-muted">{usuario.correo}</p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleAprobarInmobiliaria(usuario)}
                                        className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 bg-accent text-on-accent hover:opacity-90 transition-colors cursor-pointer"
                                    >
                                        <Check className="w-4 h-4" aria-hidden="true" />
                                        Aprobar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSolicitud({
                                                accion: 'rechazar_inmobiliaria',
                                                id: usuario.id,
                                                nombre: `${usuario.nombre} ${usuario.apellido}`,
                                            })
                                        }
                                        className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-danger text-danger hover:bg-danger hover:text-white transition-colors cursor-pointer"
                                    >
                                        <X className="w-4 h-4" aria-hidden="true" />
                                        Rechazar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-surface rounded-2xl shadow-card p-5 mb-6">
                <div className="flex items-center justify-between gap-3 mb-1">
                    <h2 className="flex items-center gap-1.5 font-heading font-semibold text-foreground">
                        <FileText className="w-4 h-4 text-primary" aria-hidden="true" />
                        Publicaciones en revisión
                    </h2>
                    <Link to="/panel-administracion/publicaciones" className="text-sm font-semibold text-primary hover:underline shrink-0">
                        Ver todo
                    </Link>
                </div>
                <p className="text-sm text-muted mb-4">
                    Pendientes de moderación inicial, o marcadas como observadas automáticamente.
                </p>
                {publicacionesEnRevision.length === 0 ? (
                    <p className="text-sm text-muted">No hay publicaciones esperando verificación.</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {publicacionesEnRevision.slice(0, LIMITE_CONDENSADO).map((publicacion) => {
                            const etiquetaEstado = ETIQUETAS_ESTADO_PUBLICACION[publicacion.estado]
                            return (
                                <div
                                    key={publicacion.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-3"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${etiquetaEstado.clase}`}>
                                                {etiquetaEstado.texto}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold text-foreground truncate">
                                            {publicacion.descripcion}
                                        </p>
                                        {publicacion.notaModeracion && (
                                            <p className="text-xs text-foreground bg-surface-hover rounded-lg px-2 py-1 mt-1">
                                                Nota: {publicacion.notaModeracion}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 shrink-0 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={() => handleAprobarPublicacion(publicacion)}
                                            className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 bg-accent text-on-accent hover:opacity-90 transition-colors cursor-pointer"
                                        >
                                            <Check className="w-4 h-4" aria-hidden="true" />
                                            Aprobar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSolicitud({
                                                    accion: 'solicitar_modificaciones',
                                                    id: publicacion.id,
                                                    nombre: 'publicación',
                                                })
                                            }
                                            className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                                        >
                                            Solicitar modif.
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSolicitud({
                                                    accion: 'ocultar_publicacion',
                                                    id: publicacion.id,
                                                    nombre: 'publicación',
                                                })
                                            }
                                            className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                                        >
                                            <Ban className="w-4 h-4" aria-hidden="true" />
                                            Ocultar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSolicitud({
                                                    accion: 'rechazar_publicacion',
                                                    id: publicacion.id,
                                                    nombre: 'publicación',
                                                })
                                            }
                                            className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-danger text-danger hover:bg-danger hover:text-white transition-colors cursor-pointer"
                                        >
                                            <X className="w-4 h-4" aria-hidden="true" />
                                            Rechazar
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="bg-surface rounded-2xl shadow-card p-5">
                <div className="flex items-center justify-between gap-3 mb-1">
                    <h2 className="flex items-center gap-1.5 font-heading font-semibold text-foreground">
                        <Flag className="w-4 h-4 text-primary" aria-hidden="true" />
                        Reclamos pendientes
                    </h2>
                    <Link to="/panel-administracion/reclamos" className="text-sm font-semibold text-primary hover:underline shrink-0">
                        Ver todo
                    </Link>
                </div>
                <p className="text-sm text-muted mb-4">
                    Reportes enviados por usuarios sobre publicaciones o sobre otros usuarios.
                </p>
                {reclamosPendientes.length === 0 ? (
                    <p className="text-sm text-muted">No hay reclamos pendientes.</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {reclamosPendientes.slice(0, LIMITE_CONDENSADO).map((reclamo) => (
                            <button
                                key={reclamo.id}
                                type="button"
                                onClick={() => setReclamoActivo(reclamo)}
                                className="w-full text-left flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-surface-hover transition-colors cursor-pointer"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-foreground truncate">
                                        {ETIQUETAS_MOTIVO_RECLAMO[reclamo.motivo]} · {obtenerNombreObjetivoReclamo(reclamo)}
                                    </p>
                                    <p className="text-xs text-muted truncate">{reclamo.descripcion}</p>
                                </div>
                                <span className={`text-xs font-semibold rounded-full px-2.5 py-1 shrink-0 ${ETIQUETAS_ESTADO_RECLAMO[reclamo.estado].clase}`}>
                                    {ETIQUETAS_ESTADO_RECLAMO[reclamo.estado].texto}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {solicitud && (
                <DialogoConMotivo solicitud={solicitud} onCancelar={() => setSolicitud(null)} onConfirmar={confirmarSolicitud} />
            )}

            {reclamoActivo && (
                <ModalDetalleReclamo
                    reclamo={reclamoActivo}
                    onClose={() => setReclamoActivo(null)}
                    onResolver={handleResolverReclamo}
                    onDescartar={handleDescartarReclamo}
                />
            )}
        </PanelLayout>
    )
}

export default PanelAdministracion
