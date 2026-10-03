import { useEffect, useState } from 'react'
import { obtenerCantidadNoLeidas } from '../mocks/notificaciones'

const INTERVALO_POLLING_MS = 3000

export function useNotificacionesNoLeidas(usuarioId: string | undefined): number {
    const [, setTick] = useState(0)

    useEffect(() => {
        if (!usuarioId) return
        const intervalo = setInterval(() => setTick((t) => t + 1), INTERVALO_POLLING_MS)
        return () => clearInterval(intervalo)
    }, [usuarioId])

    return usuarioId ? obtenerCantidadNoLeidas(usuarioId) : 0
}
