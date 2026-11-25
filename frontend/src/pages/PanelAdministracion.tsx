import { useState } from 'react'
import { Link } from 'react-router'
import { FileText, Flag, ShieldCheck, Users } from 'lucide-react'
import PanelLayout from '../layouts/PanelLayout'
import AccionesModeracion from '../components/AccionesModeracion'
import PublicacionPreviewModal from '../components/PublicacionPreviewModal'
import ModalDetalleUsuario from '../components/ModalDetalleUsuario'
import { ModalDetalleReclamo } from './AdminReclamos'
import { listarPublicacionesEnRevision, listarReclamos, listarUsuarios } from '../servicios/administracion'
import { mensajeDeError } from '../servicios/errores'
import { useConsulta } from '../hooks/useConsulta'
import { ETIQUETAS_ESTADO_PUBLICACION, type Publicacion } from '../types/publicacion'
import { ETIQUETAS_ESTADO_RECLAMO, ETIQUETAS_MOTIVO_RECLAMO, type Reclamo } from '../types/reclamo'

const LIMITE_CONDENSADO = 5

function TarjetaResumen({ icono, valor, texto, clase }: { icono: React.ReactNode; valor: number | string; texto: string; clase: string }) {
    return (
        <div className="bg-surface rounded-2xl shadow-card p-5 flex items-center gap-3">
            <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${clase}`}>{icono}</span>
            <div>
                <p className="text-2xl font-heading font-semibold text-foreground">{valor}</p>
                <p className="text-xs text-muted">{texto}</p>
            </div>
        </div>
    )
}

function PanelAdministracion() {
    const [reclamoActivo, setReclamoActivo] = useState<Reclamo | null>(null)
    const [publicacionAVer, setPublicacionAVer] = useState<Publicacion | null>(null)
    const [verPerfilPropietario, setVerPerfilPropietario] = useState(false)

    const enRevision = useConsulta('en-revision', listarPublicacionesEnRevision)
    const reclamos = useConsulta('reclamos', listarReclamos)
    const suspendidos = useConsulta('suspendidos', () => listarUsuarios('suspendido', 1))

    const publicacionesEnRevision = enRevision.datos ?? []
    const reclamosPendientes = (reclamos.datos ?? []).filter((r) => r.estado === 'pendiente' || r.estado === 'en_revision')
    const cantidadSuspendidos = suspendidos.datos?.count

    return (
        <PanelLayout>
            <h1 className="flex items-center gap-2 text-lg sm:text-xl font-heading font-semibold text-foreground mb-6">
                <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
                Panel de administración
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <TarjetaResumen
                    icono={<FileText className="w-5 h-5" aria-hidden="true" />}
                    valor={enRevision.datos ? publicacionesEnRevision.length : '…'}
                    texto="Publicaciones en revisión"
                    clase="bg-warning-subtle text-warning"
                />
                <TarjetaResumen
                    icono={<Flag className="w-5 h-5" aria-hidden="true" />}
                    valor={reclamos.datos ? reclamosPendientes.length : '…'}
                    texto="Reclamos pendientes"
                    clase="bg-warning-subtle text-warning"
                />
                <TarjetaResumen
                    icono={<Users className="w-5 h-5" aria-hidden="true" />}
                    valor={cantidadSuspendidos ?? '…'}
                    texto="Usuarios suspendidos"
                    clase="bg-danger-subtle text-danger"
                />
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
                    Pendientes de moderación inicial, o marcadas como observadas automáticamente. Tocá una
                    para ver el detalle completo, el perfil del propietario y la documentación adjunta.
                </p>
                {enRevision.cargando && publicacionesEnRevision.length === 0 ? (
                    <p className="text-sm text-muted">Cargando…</p>
                ) : enRevision.error ? (
                    <p className="text-sm text-danger">{mensajeDeError(enRevision.error)}</p>
                ) : publicacionesEnRevision.length === 0 ? (
                    <p className="text-sm text-muted">No hay publicaciones esperando verificación.</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {publicacionesEnRevision.slice(0, LIMITE_CONDENSADO).map((publicacion) => {
                            const etiquetaEstado = ETIQUETAS_ESTADO_PUBLICACION[publicacion.estado]
                            return (
                                <div
                                    key={publicacion.id}
                                    onClick={() => setPublicacionAVer(publicacion)}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-primary hover:bg-surface-hover transition-colors"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${etiquetaEstado.clase}`}>
                                                {etiquetaEstado.texto}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold text-foreground truncate">{publicacion.descripcion}</p>
                                        {publicacion.notaModeracion && (
                                            <p className="text-xs text-foreground bg-surface-hover rounded-lg px-2 py-1 mt-1">
                                                Nota: {publicacion.notaModeracion}
                                            </p>
                                        )}
                                    </div>
                                    <AccionesModeracion publicacion={publicacion} onCambio={enRevision.recargar} soloRevision />
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
                <p className="text-sm text-muted mb-4">Reportes enviados por usuarios sobre publicaciones o sobre otros usuarios.</p>
                {reclamos.cargando && reclamosPendientes.length === 0 ? (
                    <p className="text-sm text-muted">Cargando…</p>
                ) : reclamos.error ? (
                    <p className="text-sm text-danger">{mensajeDeError(reclamos.error)}</p>
                ) : reclamosPendientes.length === 0 ? (
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
                                        {ETIQUETAS_MOTIVO_RECLAMO[reclamo.motivo]} · {reclamo.nombreObjetivo}
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

            {reclamoActivo && (
                <ModalDetalleReclamo reclamo={reclamoActivo} onClose={() => setReclamoActivo(null)} onCambio={reclamos.recargar} />
            )}

            {publicacionAVer && verPerfilPropietario && publicacionAVer.propietarioDetalle && (
                <ModalDetalleUsuario usuario={publicacionAVer.propietarioDetalle} onClose={() => setVerPerfilPropietario(false)} />
            )}
            {publicacionAVer && !verPerfilPropietario && (
                <PublicacionPreviewModal
                    publicacion={publicacionAVer}
                    permitirEditar={false}
                    propietario={publicacionAVer.propietarioDetalle}
                    onVerPropietario={() => setVerPerfilPropietario(true)}
                    onClose={() => setPublicacionAVer(null)}
                />
            )}
        </PanelLayout>
    )
}

export default PanelAdministracion
