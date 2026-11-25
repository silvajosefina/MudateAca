import { api } from './api'
import type { Anunciante, EstadoPublicacion } from '../types/publicacion'
import type { Rol } from '../types/usuario'

interface ParticipanteApi {
    id: number
    nombre: string
    apellido: string
    razon_social: string | null
    rol: Rol
}

interface ConversacionApi {
    id: number
    publicacion: {
        id: number
        descripcion: string
        precio: string
        ubicacion: string
        estado: EstadoPublicacion
        foto: string | null
    }
    interesado: ParticipanteApi
    anunciante: ParticipanteApi
    no_leidos: number
    creado_en: string
    actualizado_en: string
}

interface MensajeApi {
    id: number
    autor: number
    texto: string
    leido: boolean
    enviado_en: string
}

export interface Conversacion {
    id: string
    publicacion: {
        id: string
        descripcion: string
        precio: number
        ubicacion: string
        estado: EstadoPublicacion
        foto?: string
    }
    interesado: Anunciante
    anunciante: Anunciante
    noLeidos: number
    actualizadaEn: string
}

export interface Mensaje {
    id: string
    autorId: string
    texto: string
    leido: boolean
    enviadoEn: string
}

function adaptarParticipante(p: ParticipanteApi): Anunciante {
    return { id: String(p.id), nombre: p.nombre, apellido: p.apellido, razonSocial: p.razon_social ?? undefined, rol: p.rol }
}

function adaptarConversacion(c: ConversacionApi): Conversacion {
    return {
        id: String(c.id),
        publicacion: {
            id: String(c.publicacion.id),
            descripcion: c.publicacion.descripcion,
            precio: Number(c.publicacion.precio),
            ubicacion: c.publicacion.ubicacion,
            estado: c.publicacion.estado,
            foto: c.publicacion.foto ?? undefined,
        },
        interesado: adaptarParticipante(c.interesado),
        anunciante: adaptarParticipante(c.anunciante),
        noLeidos: c.no_leidos,
        actualizadaEn: c.actualizado_en,
    }
}

function adaptarMensaje(m: MensajeApi): Mensaje {
    return { id: String(m.id), autorId: String(m.autor), texto: m.texto, leido: m.leido, enviadoEn: m.enviado_en }
}

export async function listarConversaciones() {
    const { data } = await api.get<ConversacionApi[]>('/conversaciones/')
    return data.map(adaptarConversacion)
}

// RF-15: el interesado inicia la consulta desde una publicación; si ya existía, la API la reutiliza.
export async function iniciarConversacion(publicacionId: string) {
    const { data } = await api.post<ConversacionApi>('/conversaciones/', { publicacion: Number(publicacionId) })
    return adaptarConversacion(data)
}

// Con `despuesDe`, la API devuelve solo los mensajes nuevos (polling liviano).
export async function listarMensajes(conversacionId: string, despuesDe?: string) {
    const { data } = await api.get<MensajeApi[]>(`/conversaciones/${conversacionId}/mensajes/`, {
        params: despuesDe ? { despues_de: despuesDe } : {},
    })
    return data.map(adaptarMensaje)
}

export async function enviarMensaje(conversacionId: string, texto: string) {
    const { data } = await api.post<MensajeApi>(`/conversaciones/${conversacionId}/mensajes/`, { texto })
    return adaptarMensaje(data)
}

export async function marcarConversacionLeida(conversacionId: string) {
    await api.post(`/conversaciones/${conversacionId}/leer/`)
}

export async function contarMensajesNoLeidos() {
    const { data } = await api.get<{ cantidad: number }>('/conversaciones/no-leidos/')
    return data.cantidad
}
