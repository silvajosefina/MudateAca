import type { EventoModeracion, TipoEventoModeracion } from '../types/publicacion'

const STORAGE_KEY = 'mudateaca_historial_moderacion'

function leerAlmacenamiento(): EventoModeracion[] {
    try {
        const datos = localStorage.getItem(STORAGE_KEY)
        return datos ? (JSON.parse(datos) as EventoModeracion[]) : []
    } catch {
        return []
    }
}

function guardarAlmacenamiento(lista: EventoModeracion[]) {
    historialEnMemoria = lista
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lista))
    } catch {
        // El historial sigue funcionando en memoria durante la sesión actual.
    }
}

let historialEnMemoria: EventoModeracion[] = leerAlmacenamiento()

function generarId(): string {
    return `mod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function registrarEventoModeracion(publicacionId: string, tipo: TipoEventoModeracion, nota: string): void {
    const nuevo: EventoModeracion = {
        id: generarId(),
        publicacionId,
        tipo,
        nota,
        fecha: new Date().toISOString(),
    }
    guardarAlmacenamiento([nuevo, ...historialEnMemoria])
}

export function obtenerHistorialDePublicacion(publicacionId: string): EventoModeracion[] {
    return historialEnMemoria
        .filter((e) => e.publicacionId === publicacionId)
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
}
