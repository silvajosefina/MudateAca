export type TipoNotificacion = 'exito' | 'error'

export interface Notificacion {
    id: string
    usuarioId: string
    mensaje: string
    tipo: TipoNotificacion
    leida: boolean
    creadaEn: string
}

const STORAGE_KEY = 'mudateaca_notificaciones'

function leerAlmacenamiento(): Notificacion[] {
    try {
        const datos = localStorage.getItem(STORAGE_KEY)
        return datos ? (JSON.parse(datos) as Notificacion[]) : []
    } catch {
        return []
    }
}

function guardarAlmacenamiento(lista: Notificacion[]) {
    notificacionesEnMemoria = lista
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lista))
    } catch {
        // Si el almacenamiento no está disponible, las notificaciones siguen
        // funcionando en memoria durante la sesión actual.
    }
}

let notificacionesEnMemoria: Notificacion[] = leerAlmacenamiento()

function generarId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function crearNotificacion(usuarioId: string, mensaje: string, tipo: TipoNotificacion = 'exito'): Notificacion {
    const nueva: Notificacion = {
        id: generarId(),
        usuarioId,
        mensaje,
        tipo,
        leida: false,
        creadaEn: new Date().toISOString(),
    }
    guardarAlmacenamiento([nueva, ...notificacionesEnMemoria])
    return nueva
}

export function obtenerNotificacionesDeUsuario(usuarioId: string): Notificacion[] {
    return notificacionesEnMemoria
        .filter((n) => n.usuarioId === usuarioId)
        .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))
}

export function obtenerCantidadNoLeidas(usuarioId: string): number {
    return notificacionesEnMemoria.filter((n) => n.usuarioId === usuarioId && !n.leida).length
}

export function marcarNotificacionesComoLeidas(usuarioId: string): void {
    guardarAlmacenamiento(
        notificacionesEnMemoria.map((n) => (n.usuarioId === usuarioId && !n.leida ? { ...n, leida: true } : n)),
    )
}
