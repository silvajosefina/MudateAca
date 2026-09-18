import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { suscribirseAToast, type ToastState } from '../mocks/toast'

function ToastViewport() {
    const [toast, setToast] = useState<ToastState | null>(null)

    useEffect(() => suscribirseAToast(setToast), [])

    useEffect(() => {
        if (!toast) return
        const temporizador = setTimeout(() => setToast(null), 3500)
        return () => clearTimeout(temporizador)
    }, [toast])

    if (!toast) return null

    const esError = toast.tipo === 'error'

    return (
        <div className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg bg-surface border border-border text-sm font-semibold text-foreground">
            {esError ? (
                <XCircle className="w-5 h-5 text-danger shrink-0" aria-hidden="true" />
            ) : (
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
            )}
            {toast.mensaje}
        </div>
    )
}

export default ToastViewport
