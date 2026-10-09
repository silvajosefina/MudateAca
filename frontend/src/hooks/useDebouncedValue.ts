import { useEffect, useState } from 'react'

export function useDebouncedValue<T>(valor: T, retrasoMs: number): T {
    const [valorDebounced, setValorDebounced] = useState(valor)

    useEffect(() => {
        const temporizador = setTimeout(() => setValorDebounced(valor), retrasoMs)
        return () => clearTimeout(temporizador)
    }, [valor, retrasoMs])

    return valorDebounced
}
