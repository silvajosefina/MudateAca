import { api } from './api'
import type { Pagina } from './publicaciones'

export type TipoNotificacion = 'exito' | 'error'

interface NotificacionApi {
    id: number
    mensaje: string
    tipo: TipoNotificacion
    leida: boolean
    referencia: { tipo: string; id: number } | null
    creado_en: string
}

export interface Notificacion {
    id: string
    mensaje: string
    tipo: TipoNotificacion
    leida: boolean
    creadaEn: string
    enlace?: string
}

// La API indica a qué objeto se refiere la notificación; el frontend decide adónde llevar.
function enlaceDe(referencia: NotificacionApi['referencia']): string | undefined {
    if (!referencia) return undefined
    switch (referencia.tipo) {
        case 'publicacion':
            return `/explorar/${referencia.id}`
        case 'busquedaactiva':
            return '/mis-busquedas'
        case 'reclamo':
            return '/mis-reclamos'
        case 'conversacion':
            return `/mensajes?conversacion=${referencia.id}`
        default:
            return undefined
    }
}

function adaptarNotificacion(n: NotificacionApi): Notificacion {
    return {
        id: String(n.id),
        mensaje: n.mensaje,
        tipo: n.tipo,
        leida: n.leida,
        creadaEn: n.creado_en,
        enlace: enlaceDe(n.referencia),
    }
}

export async function listarNotificaciones(pagina: number): Promise<Pagina<Notificacion>> {
    const { data } = await api.get<Pagina<NotificacionApi>>('/notificaciones/', { params: { pagina } })
    return { ...data, results: data.results.map(adaptarNotificacion) }
}

export async function contarNotificacionesNoLeidas() {
    const { data } = await api.get<{ cantidad: number }>('/notificaciones/no-leidas/')
    return data.cantidad
}

export async function marcarNotificacionesLeidas() {
    await api.post('/notificaciones/marcar-leidas/')
}

export async function eliminarNotificacion(id: string) {
    await api.delete(`/notificaciones/${id}/`)
}

export async function eliminarTodasLasNotificaciones() {
    await api.delete('/notificaciones/')
}
