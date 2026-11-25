import { api } from './api'
import type { EstadoReclamo, MotivoReclamo, Reclamo, TipoObjetivoReclamo } from '../types/reclamo'

interface PersonaApi {
    id: number
    nombre: string
    apellido: string
    razon_social: string | null
}

export interface ReclamoApi {
    id: number
    objetivo: TipoObjetivoReclamo
    reclamante: PersonaApi
    publicacion: { id: number; descripcion: string } | null
    usuario_reportado: PersonaApi | null
    motivo: MotivoReclamo
    descripcion: string
    estado: EstadoReclamo
    nota_administrador: string | null
    creado_en: string
    actualizado_en: string
}

function resumir(texto: string, largo = 50) {
    return texto.length <= largo ? texto : `${texto.slice(0, largo).trimEnd()}…`
}

export function adaptarReclamo(r: ReclamoApi): Reclamo {
    const esPublicacion = r.objetivo === 'publicacion'
    const objetivoId = esPublicacion ? r.publicacion?.id : r.usuario_reportado?.id
    return {
        id: String(r.id),
        reclamanteId: String(r.reclamante.id),
        objetivoTipo: r.objetivo,
        objetivoId: String(objetivoId ?? ''),
        nombreObjetivo: esPublicacion
            ? resumir(r.publicacion?.descripcion ?? 'Publicación')
            : `${r.usuario_reportado?.nombre ?? ''} ${r.usuario_reportado?.apellido ?? ''}`.trim(),
        motivo: r.motivo,
        descripcion: r.descripcion,
        estado: r.estado,
        notaAdmin: r.nota_administrador ?? undefined,
        creadoEn: r.creado_en,
        actualizadoEn: r.actualizado_en,
    }
}

export interface DatosReclamo {
    objetivoTipo: TipoObjetivoReclamo
    objetivoId: string
    motivo: MotivoReclamo
    descripcion: string
}

// RF-16 y RF-17: el reclamo apunta a una publicación o a un usuario, nunca a los dos.
export async function crearReclamo({ objetivoTipo, objetivoId, motivo, descripcion }: DatosReclamo) {
    const objetivo = objetivoTipo === 'publicacion' ? { publicacion: Number(objetivoId) } : { usuario_reportado: Number(objetivoId) }
    const { data } = await api.post<ReclamoApi>('/reclamos/', { ...objetivo, motivo, descripcion })
    return adaptarReclamo(data)
}

export async function listarMisReclamos() {
    const { data } = await api.get<ReclamoApi[]>('/reclamos/mios/')
    return data.map(adaptarReclamo)
}
