import { useCallback, useEffect, useState } from 'react'

interface Resultado<T> {
    clave: string
    datos?: T
    error?: unknown
}

// Pide datos a la API cada vez que cambia `clave` (por ejemplo, los filtros y la página).
// Mientras llega la respuesta nueva conserva los datos anteriores, para que la pantalla
// no parpadee. Si llega tarde la respuesta de una consulta vieja, se descarta.
export function useConsulta<T>(clave: string, consultar: () => Promise<T>) {
    const [resultado, setResultado] = useState<Resultado<T> | null>(null)
    const [version, setVersion] = useState(0)
    const claveActual = `${clave}#${version}`

    useEffect(() => {
        let vigente = true
        consultar()
            .then((datos) => {
                if (vigente) setResultado({ clave: claveActual, datos })
            })
            .catch((error: unknown) => {
                if (vigente) setResultado({ clave: claveActual, error })
            })
        return () => {
            vigente = false
        }
        // La consulta se repite solo cuando cambia la clave: `consultar` se recrea en cada render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [claveActual])

    const recargar = useCallback(() => setVersion((v) => v + 1), [])
    const actual = resultado?.clave === claveActual ? resultado : null

    return {
        datos: resultado?.datos,
        error: actual?.error,
        cargando: actual === null,
        recargar,
    }
}
