import { Mail, Phone, X } from 'lucide-react'
import { ETIQUETAS_ESTADO_CUENTA, ETIQUETAS_ESTADO_VERIFICACION, ETIQUETAS_ROL, type Usuario } from '../types/usuario'

interface ModalDetalleUsuarioProps {
    usuario: Usuario
    onClose: () => void
}

function ModalDetalleUsuario({ usuario, onClose }: ModalDetalleUsuarioProps) {
    const muestraVerificacion = usuario.rol === 'propietario' || usuario.rol === 'inmobiliaria'
    const etiquetaCuenta = ETIQUETAS_ESTADO_CUENTA[usuario.estadoCuenta]
    const etiquetaVerificacion = ETIQUETAS_ESTADO_VERIFICACION[usuario.estadoVerificacion]
    const iniciales = `${usuario.nombre.charAt(0)}${usuario.apellido.charAt(0)}`.toUpperCase()

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-overlay/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-surface rounded-2xl shadow-card w-full max-w-sm overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative bg-gradient-to-br from-[var(--color-banner-hero-from)] to-[var(--color-banner-hero-to)] px-6 pt-6 pb-5 flex flex-col items-center text-center">
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="absolute top-3 right-3 inline-flex items-center justify-center w-7 h-7 rounded-full text-[var(--color-banner-text)] hover:bg-surface/15 transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface text-primary font-heading font-bold text-xl shadow-lg">
                        {iniciales}
                    </span>
                    <h3 className="text-base font-heading font-semibold text-[var(--color-banner-text)] mt-3">
                        {usuario.nombre} {usuario.apellido}
                    </h3>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                        <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-surface/20 text-[var(--color-banner-text)]">
                            {ETIQUETAS_ROL[usuario.rol]}
                        </span>
                        <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${etiquetaCuenta.clase}`}>
                            {etiquetaCuenta.texto}
                        </span>
                        {muestraVerificacion && (
                            <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${etiquetaVerificacion.clase}`}>
                                {etiquetaVerificacion.texto}
                            </span>
                        )}
                    </div>
                </div>

                <div className="p-6 flex flex-col gap-4">
                    <div className="flex flex-col gap-2.5 text-sm text-foreground">
                        <p className="flex items-center gap-2.5">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-subtle text-primary shrink-0">
                                <Mail className="w-4 h-4" aria-hidden="true" />
                            </span>
                            {usuario.correo}
                        </p>
                        <p className="flex items-center gap-2.5">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-subtle text-primary shrink-0">
                                <Phone className="w-4 h-4" aria-hidden="true" />
                            </span>
                            {usuario.celular}
                        </p>
                    </div>

                    {usuario.estadoCuenta === 'suspendido' && usuario.motivoSuspension && (
                        <p className="text-xs text-danger bg-danger-subtle rounded-lg px-3 py-2">
                            Motivo de suspensión: {usuario.motivoSuspension}
                        </p>
                    )}
                    {usuario.estadoVerificacion === 'rechazado' && usuario.motivoRechazo && (
                        <p className="text-xs text-danger bg-danger-subtle rounded-lg px-3 py-2">
                            Motivo del rechazo: {usuario.motivoRechazo}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ModalDetalleUsuario
