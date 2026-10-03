import { useState } from 'react'
import { AlertTriangle, Building2, Check, FileText, ShieldCheck, X } from 'lucide-react'
import PanelLayout from '../layouts/PanelLayout'
import {
    aprobarVerificacionPublicacion,
    obtenerPublicacionesEnRevision,
    rechazarVerificacionPublicacion,
} from '../mocks/publicaciones'
import {
    actualizarEstadoVerificacionUsuario,
    obtenerInmobiliariasPendientes,
    obtenerUsuarioPorId,
} from '../mocks/usuarios'
import { mostrarToast } from '../mocks/toast'
import type { Publicacion, TipoDocumentoVerificacionPublicacion } from '../types/publicacion'
import type { Usuario } from '../types/usuario'

const ETIQUETAS_DOCUMENTO: Record<TipoDocumentoVerificacionPublicacion, string> = {
    factura_servicio: 'Factura de un servicio asociada al domicilio',
    impuesto: 'Impuesto correspondiente al inmueble',
    documentacion_propiedad: 'Documentación de propiedad',
    matricula_corredor: 'Matrícula de corredor/a inmobiliario/a',
    constancia_inscripcion: 'Constancia de inscripción o CUIT de la inmobiliaria',
    poder_representacion: 'Poder o autorización de representación del propietario',
}

type Rechazo = { tipo: 'inmobiliaria' | 'publicacion'; id: string; nombre: string }

function DialogoRechazo({
    rechazo,
    onCancelar,
    onConfirmar,
}: {
    rechazo: Rechazo
    onCancelar: () => void
    onConfirmar: (motivo: string) => void
}) {
    const [motivo, setMotivo] = useState('')
    const [error, setError] = useState('')

    function handleConfirmar() {
        if (!motivo.trim()) {
            setError('Explicá el motivo del rechazo para que la persona pueda corregirlo.')
            return
        }
        onConfirmar(motivo.trim())
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/70 p-4" onClick={onCancelar}>
            <div
                className="bg-surface rounded-2xl shadow-lg w-full max-w-sm p-6 flex flex-col gap-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 shrink-0 text-danger" aria-hidden="true" />
                        <h3 className="text-base font-heading font-semibold text-foreground">Rechazar {rechazo.nombre}</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onCancelar}
                        aria-label="Cerrar"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-foreground hover:bg-surface-hover transition-colors cursor-pointer shrink-0"
                    >
                        <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">Motivo del rechazo</label>
                    <textarea
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        rows={3}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${error ? 'border-danger' : 'border-border'
                            }`}
                    />
                    {error && <p className="text-xs text-danger mt-1">{error}</p>}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-1">
                    <button
                        type="button"
                        onClick={handleConfirmar}
                        className="inline-flex items-center justify-center gap-1.5 font-heading font-semibold rounded-lg py-2 px-6 bg-danger text-white hover:opacity-90 transition-colors cursor-pointer"
                    >
                        Rechazar
                    </button>
                    <button
                        type="button"
                        onClick={onCancelar}
                        className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg py-2 px-6 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    )
}

function PanelAdministracion() {
    const [inmobiliarias, setInmobiliarias] = useState<Usuario[]>(() => obtenerInmobiliariasPendientes())
    const [publicaciones, setPublicaciones] = useState<Publicacion[]>(() => obtenerPublicacionesEnRevision())
    const [rechazo, setRechazo] = useState<Rechazo | null>(null)

    function refrescar() {
        setInmobiliarias(obtenerInmobiliariasPendientes())
        setPublicaciones(obtenerPublicacionesEnRevision())
    }

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

    function confirmarRechazo(motivo: string) {
        if (!rechazo) return
        if (rechazo.tipo === 'inmobiliaria') {
            actualizarEstadoVerificacionUsuario(rechazo.id, 'rechazado', motivo)
        } else {
            rechazarVerificacionPublicacion(rechazo.id, motivo)
        }
        mostrarToast('Rechazo registrado.', 'error')
        setRechazo(null)
        refrescar()
    }

    return (
        <PanelLayout>
            <h1 className="flex items-center gap-2 text-lg sm:text-xl font-heading font-semibold text-foreground mb-6">
                <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
                Panel de administración
            </h1>

            <div className="bg-surface rounded-2xl shadow-lg p-5 mb-6">
                <h2 className="flex items-center gap-1.5 font-heading font-semibold text-foreground mb-4">
                    <Building2 className="w-4 h-4 text-primary" aria-hidden="true" />
                    Inmobiliarias pendientes de verificación
                </h2>
                {inmobiliarias.length === 0 ? (
                    <p className="text-sm text-muted">No hay inmobiliarias esperando verificación.</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {inmobiliarias.map((usuario) => (
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
                                        className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 bg-accent text-foreground hover:opacity-90 transition-colors cursor-pointer"
                                    >
                                        <Check className="w-4 h-4" aria-hidden="true" />
                                        Aprobar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setRechazo({ tipo: 'inmobiliaria', id: usuario.id, nombre: `${usuario.nombre} ${usuario.apellido}` })
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

            <div className="bg-surface rounded-2xl shadow-lg p-5">
                <h2 className="flex items-center gap-1.5 font-heading font-semibold text-foreground mb-4">
                    <FileText className="w-4 h-4 text-primary" aria-hidden="true" />
                    Publicaciones en revisión
                </h2>
                {publicaciones.length === 0 ? (
                    <p className="text-sm text-muted">No hay publicaciones esperando verificación.</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {publicaciones.map((publicacion) => {
                            const propietario = obtenerUsuarioPorId(publicacion.propietarioId)
                            return (
                                <div
                                    key={publicacion.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-3"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-foreground truncate">
                                            {publicacion.descripcion}
                                        </p>
                                        <p className="text-xs text-muted">
                                            {propietario ? `${propietario.nombre} ${propietario.apellido}` : 'Propietario'} ·{' '}
                                            {publicacion.ubicacion}
                                        </p>
                                        <p className="text-xs text-muted mt-1">
                                            {publicacion.tipoDocumentoVerificacion
                                                ? ETIQUETAS_DOCUMENTO[publicacion.tipoDocumentoVerificacion]
                                                : 'Sin tipo de documento'}
                                            {publicacion.nombreArchivoVerificacion && ` · ${publicacion.nombreArchivoVerificacion}`}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleAprobarPublicacion(publicacion)}
                                            className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 bg-accent text-foreground hover:opacity-90 transition-colors cursor-pointer"
                                        >
                                            <Check className="w-4 h-4" aria-hidden="true" />
                                            Aprobar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setRechazo({
                                                    tipo: 'publicacion',
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

            {rechazo && (
                <DialogoRechazo rechazo={rechazo} onCancelar={() => setRechazo(null)} onConfirmar={confirmarRechazo} />
            )}
        </PanelLayout>
    )
}

export default PanelAdministracion
