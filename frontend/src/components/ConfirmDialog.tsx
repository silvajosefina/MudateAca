import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
    titulo: string
    mensaje: string
    textoConfirmar?: string
    textoCancelar?: string
    onConfirmar: () => void
    onCancelar: () => void
    peligroso?: boolean
}

function ConfirmDialog({
    titulo,
    mensaje,
    textoConfirmar = 'Confirmar',
    textoCancelar = 'Cancelar',
    onConfirmar,
    onCancelar,
    peligroso = false,
}: ConfirmDialogProps) {
    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/70 p-4"
            onClick={onCancelar}
        >
            <div
                className="bg-surface rounded-2xl shadow-lg w-full max-w-sm p-6 flex flex-col gap-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <AlertTriangle
                            className={`w-5 h-5 shrink-0 ${peligroso ? 'text-danger' : 'text-warning'}`}
                            aria-hidden="true"
                        />
                        <h3 className="text-base font-heading font-semibold text-foreground">{titulo}</h3>
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
                <p className="text-sm text-muted">{mensaje}</p>
                <div className="flex flex-col sm:flex-row gap-3 mt-1">
                    <button
                        type="button"
                        onClick={onConfirmar}
                        className={`inline-flex items-center justify-center gap-1.5 text-white font-heading font-semibold rounded-lg py-2 px-6 transition-colors cursor-pointer ${peligroso ? 'bg-danger hover:opacity-90' : 'bg-primary hover:bg-primary-hover'
                            }`}
                    >
                        {textoConfirmar}
                    </button>
                    <button
                        type="button"
                        onClick={onCancelar}
                        className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg py-2 px-6 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                    >
                        {textoCancelar}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ConfirmDialog
