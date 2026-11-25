import { useEffect, useSyncExternalStore } from 'react'
import { api } from './api'
import { adaptarPublicacion, type Pagina, type PublicacionApi } from './publicaciones'
import type { EstadoPublicacion, Publicacion } from '../types/publicacion'

interface FavoritoApi {
    id: number
    disponible: boolean
    // Si la publicación dejó de ser pública, la API solo informa su id y su estado.
    publicacion: PublicacionApi | { id: number; estado: EstadoPublicacion }
    creado_en: string
}

export interface Favorito {
    id: string
    publicacionId: string
    disponible: boolean
    estado: EstadoPublicacion
    publicacion?: Publicacion
}

function adaptarFavorito(favorito: FavoritoApi): Favorito {
    const publicacion = favorito.disponible ? adaptarPublicacion(favorito.publicacion as PublicacionApi) : undefined
    return {
        id: String(favorito.id),
        publicacionId: String(favorito.publicacion.id),
        disponible: favorito.disponible,
        estado: favorito.publicacion.estado,
        publicacion,
    }
}

export async function listarFavoritos(pagina: number): Promise<Pagina<Favorito>> {
    const { data } = await api.get<Pagina<FavoritoApi>>('/favoritos/', { params: { pagina } })
    return { ...data, results: data.results.map(adaptarFavorito) }
}

// ---- Qué publicaciones son favoritas, para pintar el corazón en cada tarjeta ----

let idsFavoritos = new Set<string>()
let cargadoPara: string | null = null
let cargaEnCurso: Promise<void> | null = null
let version = 0
const suscriptores = new Set<() => void>()

function avisar() {
    version += 1
    suscriptores.forEach((aviso) => aviso())
}

async function cargarTodos(usuarioId: string) {
    const ids = new Set<string>()
    let pagina = 1
    for (;;) {
        const resultado = await listarFavoritos(pagina)
        resultado.results.forEach((favorito) => ids.add(favorito.publicacionId))
        if (!resultado.next) break
        pagina += 1
    }
    idsFavoritos = ids
    cargadoPara = usuarioId
    avisar()
}

function asegurarCarga(usuarioId: string) {
    if (cargadoPara === usuarioId || cargaEnCurso) return
    cargaEnCurso = cargarTodos(usuarioId)
        .catch(() => undefined)
        .finally(() => {
            cargaEnCurso = null
        })
}

export function esFavorito(publicacionId: string) {
    return idsFavoritos.has(publicacionId)
}

export async function agregarFavorito(publicacionId: string) {
    await api.post('/favoritos/', { publicacion: Number(publicacionId) })
    idsFavoritos.add(publicacionId)
    avisar()
}

export async function quitarFavorito(publicacionId: string) {
    await api.delete(`/favoritos/${publicacionId}/`)
    idsFavoritos.delete(publicacionId)
    avisar()
}

function suscribir(aviso: () => void) {
    suscriptores.add(aviso)
    return () => suscriptores.delete(aviso)
}

// Carga una sola vez los favoritos del interesado y redibuja cuando cambian.
// Con `usuarioId` vacío (visitante u otro rol) no consulta nada.
export function useFavoritos(usuarioId: string | undefined) {
    useSyncExternalStore(suscribir, () => version)
    useEffect(() => {
        if (usuarioId) asegurarCarga(usuarioId)
    }, [usuarioId])
    return esFavorito
}
