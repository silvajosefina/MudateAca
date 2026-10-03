export interface Conversacion {
    id: string
    publicacionId: string
    interesadoId: string
    anuncianteId: string
    creadaEn: string
    actualizadaEn: string
}

export interface Mensaje {
    id: string
    conversacionId: string
    autorId: string
    texto: string
    enviadoEn: string
    leido: boolean
}
