import { useEffect, useState } from 'react'

// El servidor tiene poca memoria: los contadores del encabezado se consultan cada
// 15 segundos y solo mientras la pestaña está a la vista.
const INTERVALO_MS = 15000

export const EVENTO_ACTUALIZAR_CONTADORES = 'mudateaca:actualizar-contadores'

// Avisa a los contadores que cambió algo (por ejemplo, se leyó una conversación).
export function actualizarContadores() {
    window.dispatchEvent(new Event(EVENTO_ACTUALIZAR_CONTADORES))
}

// Consulta periódica de un contador (mensajes o notificaciones sin leer).
// Sin usuario no consulta nada y devuelve 0.
export function useContador(usuarioId: string | undefined, consultar: () => Promise<number>) {
    const [cantidad, setCantidad] = useState(0)

    useEffect(() => {
        if (!usuarioId) return
        let vigente = true

        function actualizar() {
            if (document.visibilityState !== 'visible') return
            consultar()
                .then((valor) => {
                    if (vigente) setCantidad(valor)
                })
                .catch(() => undefined)
        }

        actualizar()
        const intervalo = setInterval(actualizar, INTERVALO_MS)
        document.addEventListener('visibilitychange', actualizar)
        window.addEventListener(EVENTO_ACTUALIZAR_CONTADORES, actualizar)
        return () => {
            vigente = false
            clearInterval(intervalo)
            document.removeEventListener('visibilitychange', actualizar)
            window.removeEventListener(EVENTO_ACTUALIZAR_CONTADORES, actualizar)
        }
        // `consultar` es siempre la misma función del servicio.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usuarioId])

    return usuarioId ? cantidad : 0
}
