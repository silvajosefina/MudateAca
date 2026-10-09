import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { ETIQUETAS_ACCION_MOTIVO, type SolicitudConMotivo } from '../types/accionAdmin'

function DialogoConMotivo({
    solicitud,
    onCancelar,
    onConfirmar,
}: {
    solicitud: SolicitudConMotivo
    onCancelar: () => void
    onConfirmar: (motivo: string) => void
}) {
    const [motivo, setMotivo] = useState('')
    const [error, setError] = useState('')
    const etiquetas = ETIQUETAS_ACCION_MOTIVO[solicitud.accion]

    function handleConfirmar() {
        if (!motivo.trim()) {
            setError(etiquetas.placeholder)
            return
        }
        onConfirmar(motivo.trim())
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-overlay/70 backdrop-blur-sm p-4" onClick={onCancelar}>
            <div
                className="bg-surface rounded-2xl shadow-card w-full max-w-sm p-6 flex flex-col gap-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 shrink-0 text-danger" aria-hidden="true" />
                        <h3 className="text-base font-heading font-semibold text-foreground">
                            {etiquetas.titulo(solicitud.nombre)}
                        </h3>
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
                    <label className="block text-sm font-semibold text-foreground mb-1">{etiquetas.etiquetaMotivo}</label>
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
                        {etiquetas.textoBoton}
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

export default DialogoConMotivo
