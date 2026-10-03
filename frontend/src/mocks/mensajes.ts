import type { Conversacion, Mensaje } from '../types/mensaje'

function generarId(prefijo: string): string {
    return `${prefijo}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

let conversacionesEnMemoria: Conversacion[] = []
let mensajesEnMemoria: Mensaje[] = []

export function obtenerConversacionesDeUsuario(usuarioId: string): Conversacion[] {
    return conversacionesEnMemoria
        .filter((c) => c.interesadoId === usuarioId || c.anuncianteId === usuarioId)
        .sort((a, b) => b.actualizadaEn.localeCompare(a.actualizadaEn))
}

export function obtenerConversacionPorId(id: string): Conversacion | undefined {
    return conversacionesEnMemoria.find((c) => c.id === id)
}

export function obtenerOCrearConversacion(
    publicacionId: string,
    interesadoId: string,
    anuncianteId: string,
): Conversacion {
    const existente = conversacionesEnMemoria.find(
        (c) => c.publicacionId === publicacionId && c.interesadoId === interesadoId && c.anuncianteId === anuncianteId,
    )
    if (existente) return existente

    const ahora = new Date().toISOString()
    const nueva: Conversacion = {
        id: generarId('conv'),
        publicacionId,
        interesadoId,
        anuncianteId,
        creadaEn: ahora,
        actualizadaEn: ahora,
    }
    conversacionesEnMemoria = [nueva, ...conversacionesEnMemoria]
    return nueva
}

export function obtenerMensajes(conversacionId: string): Mensaje[] {
    return mensajesEnMemoria
        .filter((m) => m.conversacionId === conversacionId)
        .sort((a, b) => a.enviadoEn.localeCompare(b.enviadoEn))
}

export function enviarMensaje(conversacionId: string, autorId: string, texto: string): Mensaje {
    const nuevo: Mensaje = {
        id: generarId('msj'),
        conversacionId,
        autorId,
        texto,
        enviadoEn: new Date().toISOString(),
        leido: false,
    }
    mensajesEnMemoria = [...mensajesEnMemoria, nuevo]
    conversacionesEnMemoria = conversacionesEnMemoria.map((c) =>
        c.id === conversacionId ? { ...c, actualizadaEn: nuevo.enviadoEn } : c,
    )
    return nuevo
}

export function marcarConversacionComoLeida(conversacionId: string, usuarioId: string) {
    mensajesEnMemoria = mensajesEnMemoria.map((m) =>
        m.conversacionId === conversacionId && m.autorId !== usuarioId && !m.leido ? { ...m, leido: true } : m,
    )
}

export function obtenerCantidadNoLeidos(usuarioId: string): number {
    const conversacionesDeUsuario = new Set(obtenerConversacionesDeUsuario(usuarioId).map((c) => c.id))
    return mensajesEnMemoria.filter(
        (m) => conversacionesDeUsuario.has(m.conversacionId) && m.autorId !== usuarioId && !m.leido,
    ).length
}

const AHORA = new Date()
function hace(minutos: number): string {
    return new Date(AHORA.getTime() - minutos * 60000).toISOString()
}

const CONVERSACION_SEMILLA: Conversacion = {
    id: 'conv_seed_1',
    publicacionId: 'pub_seed_1',
    interesadoId: 'u1',
    anuncianteId: 'u2',
    creadaEn: hace(60),
    actualizadaEn: hace(5),
}
conversacionesEnMemoria = [CONVERSACION_SEMILLA]
mensajesEnMemoria = [
    { id: 'msj_seed_1', conversacionId: 'conv_seed_1', autorId: 'u1', texto: '¡Hola! ¿El departamento sigue disponible?', enviadoEn: hace(60), leido: true },
    { id: 'msj_seed_2', conversacionId: 'conv_seed_1', autorId: 'u2', texto: 'Hola, sí, todavía está disponible.', enviadoEn: hace(45), leido: true },
    { id: 'msj_seed_3', conversacionId: 'conv_seed_1', autorId: 'u1', texto: '¿Puedo coordinar una visita este fin de semana?', enviadoEn: hace(5), leido: false },
]
