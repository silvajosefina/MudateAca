export type VistaListado = 'lista' | 'grilla'

const STORAGE_KEY = 'mudateaca_vista_publicaciones'

export function obtenerVistaListado(): VistaListado {
    try {
        const guardada = localStorage.getItem(STORAGE_KEY)
        if (guardada === 'lista' || guardada === 'grilla') return guardada
    } catch {
        // noop
    }
    return 'grilla'
}

export function guardarVistaListado(vista: VistaListado) {
    try {
        localStorage.setItem(STORAGE_KEY, vista)
    } catch {
        // El toggle sigue funcionando en memoria durante la sesión actual.
    }
}
