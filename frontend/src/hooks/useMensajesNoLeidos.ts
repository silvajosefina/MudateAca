import { useEffect, useState } from 'react'
import { obtenerCantidadNoLeidos } from '../mocks/mensajes'

const INTERVALO_POLLING_MS = 3000

export function useMensajesNoLeidos(usuarioId: string | undefined): number {
    const [, setTick] = useState(0)

    useEffect(() => {
        if (!usuarioId) return
        const intervalo = setInterval(() => setTick((t) => t + 1), INTERVALO_POLLING_MS)
        return () => clearInterval(intervalo)
    }, [usuarioId])

    return usuarioId ? obtenerCantidadNoLeidos(usuarioId) : 0
}
