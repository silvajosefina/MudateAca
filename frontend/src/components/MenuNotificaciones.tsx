import { useEffect, useRef, useState } from 'react'
import { Bell, CheckCircle2, XCircle } from 'lucide-react'
import {
    obtenerNotificacionesDeUsuario,
    marcarNotificacionesComoLeidas,
    type Notificacion,
} from '../mocks/notificaciones'
import { useNotificacionesNoLeidas } from '../hooks/useNotificacionesNoLeidas'

interface MenuNotificacionesProps {
    usuarioId: string
}

function formatearFecha(iso: string): string {
    return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function MenuNotificaciones({ usuarioId }: MenuNotificacionesProps) {
    const [abierto, setAbierto] = useState(false)
    const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
    const noLeidas = useNotificacionesNoLeidas(usuarioId)
    const contenedorRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickFuera(e: MouseEvent) {
            if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
                setAbierto(false)
            }
        }
        document.addEventListener('mousedown', handleClickFuera)
        return () => document.removeEventListener('mousedown', handleClickFuera)
    }, [])

    function handleAbrir() {
        const abrira = !abierto
        setAbierto(abrira)
        if (abrira) {
            setNotificaciones(obtenerNotificacionesDeUsuario(usuarioId))
            marcarNotificacionesComoLeidas(usuarioId)
        }
    }

    return (
        <div className="relative" ref={contenedorRef}>
            <button
                type="button"
                onClick={handleAbrir}
                aria-haspopup="true"
                aria-expanded={abierto}
                aria-label="Notificaciones"
                className="relative inline-flex items-center justify-center w-9 h-9 rounded-full text-foreground hover:bg-primary-subtle transition-colors cursor-pointer"
            >
                <Bell className="w-5 h-5" aria-hidden="true" />
                {noLeidas > 0 && (
                    <span className="absolute top-0.5 right-0.5 inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] rounded-full bg-danger text-white text-[10px] font-bold px-1">
                        {noLeidas > 9 ? '9+' : noLeidas}
                    </span>
                )}
            </button>

            {abierto && (
                <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-surface rounded-xl shadow-xl border border-border overflow-hidden z-40">
                    <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-semibold text-foreground">Notificaciones</p>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notificaciones.length === 0 ? (
                            <p className="text-sm text-muted text-center px-4 py-6">No tenés notificaciones todavía.</p>
                        ) : (
                            notificaciones.map((n) => (
                                <div key={n.id} className="flex items-start gap-2 px-4 py-3 border-b border-border last:border-b-0">
                                    {n.tipo === 'error' ? (
                                        <XCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" aria-hidden="true" />
                                    ) : (
                                        <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" aria-hidden="true" />
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-sm text-foreground">{n.mensaje}</p>
                                        <p className="text-xs text-muted mt-0.5">{formatearFecha(n.creadaEn)}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default MenuNotificaciones
