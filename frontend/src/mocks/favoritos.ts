import type { Publicacion } from '../types/publicacion'
import { obtenerPublicacionPorId } from './publicaciones'

interface Favorito {
    usuarioId: string
    publicacionId: string
    creadoEn: string
}

const STORAGE_KEY = 'mudateaca_favoritos'

function leerAlmacenamiento(): Favorito[] {
    try {
        const datos = localStorage.getItem(STORAGE_KEY)
        return datos ? (JSON.parse(datos) as Favorito[]) : []
    } catch {
        return []
    }
}

function guardarAlmacenamiento(lista: Favorito[]) {
    favoritosEnMemoria = lista
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lista))
    } catch {
        // Si el almacenamiento no está disponible (modo privado, cuota excedida),
        // los favoritos siguen funcionando en memoria durante la sesión actual.
    }
}

let favoritosEnMemoria: Favorito[] = leerAlmacenamiento()

export function esFavorito(usuarioId: string, publicacionId: string): boolean {
    return favoritosEnMemoria.some((f) => f.usuarioId === usuarioId && f.publicacionId === publicacionId)
}

export function agregarFavorito(usuarioId: string, publicacionId: string): void {
    if (esFavorito(usuarioId, publicacionId)) return
    guardarAlmacenamiento([...favoritosEnMemoria, { usuarioId, publicacionId, creadoEn: new Date().toISOString() }])
}

export function quitarFavorito(usuarioId: string, publicacionId: string): void {
    guardarAlmacenamiento(favoritosEnMemoria.filter((f) => !(f.usuarioId === usuarioId && f.publicacionId === publicacionId)))
}

export function obtenerFavoritosDeUsuario(usuarioId: string): Publicacion[] {
    return favoritosEnMemoria
        .filter((f) => f.usuarioId === usuarioId)
        .map((f) => obtenerPublicacionPorId(f.publicacionId))
        .filter((p): p is Publicacion => Boolean(p))
}

export function obtenerUsuariosQueGuardaronFavorita(publicacionId: string): string[] {
    return favoritosEnMemoria.filter((f) => f.publicacionId === publicacionId).map((f) => f.usuarioId)
}
