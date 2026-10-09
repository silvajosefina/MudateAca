import { useState } from 'react'
import { useLocation } from 'react-router'
import { HelpCircle, Mail, X } from 'lucide-react'
import { obtenerSesion } from '../mocks/sesion'

function BotonAyuda() {
    // useLocation fuerza un nuevo render en cada navegación (incluida la de
    // iniciar/cerrar sesión), para que el botón refleje el rol vigente.
    useLocation()
    const [abierto, setAbierto] = useState(false)
    const sesion = obtenerSesion()

    if (sesion?.rol === 'administrador') return null

    return (
        <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
            {abierto && (
                <div className="w-72 bg-surface border border-border rounded-2xl shadow-card p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="font-heading font-semibold text-foreground text-sm">¿Necesitás ayuda?</h3>
                        <button
                            type="button"
                            onClick={() => setAbierto(false)}
                            aria-label="Cerrar ayuda"
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-muted hover:bg-surface-hover transition-colors cursor-pointer shrink-0"
                        >
                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                    </div>
                    <p className="text-xs text-muted">
                        Escribinos y te respondemos a la brevedad para ayudarte con publicaciones, búsquedas o
                        cualquier duda sobre Mudate Acá.
                    </p>
                    <a
                        href="mailto:contacto@mudateaca.com"
                        className="inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-surface text-sm font-semibold rounded-lg px-3 py-2 transition-colors cursor-pointer"
                    >
                        <Mail className="w-4 h-4" aria-hidden="true" />
                        contacto@mudateaca.com
                    </a>
                </div>
            )}
            <button
                type="button"
                onClick={() => setAbierto((v) => !v)}
                aria-label={abierto ? 'Cerrar ayuda' : 'Abrir ayuda y soporte'}
                aria-expanded={abierto}
                className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary hover:bg-primary-hover text-surface shadow-card transition-colors cursor-pointer"
            >
                {abierto ? <X className="w-5 h-5" aria-hidden="true" /> : <HelpCircle className="w-5 h-5" aria-hidden="true" />}
            </button>
        </div>
    )
}

export default BotonAyuda
