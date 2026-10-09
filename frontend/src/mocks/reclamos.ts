import { obtenerPublicacionPorId } from './publicaciones'
import { obtenerUsuarioPorId } from './usuarios'
import { crearNotificacion } from './notificaciones'
import { ETIQUETAS_ROL } from '../types/usuario'
import type { EstadoReclamo, MotivoReclamo, Reclamo, TipoObjetivoReclamo } from '../types/reclamo'

const STORAGE_KEY = 'mudateaca_reclamos'

function leerAlmacenamiento(): Reclamo[] {
    try {
        const datos = localStorage.getItem(STORAGE_KEY)
        return datos ? (JSON.parse(datos) as Reclamo[]) : []
    } catch {
        return []
    }
}

function guardarAlmacenamiento(lista: Reclamo[]) {
    reclamosEnMemoria = lista
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lista))
    } catch {
        // Si el almacenamiento no está disponible, los reclamos siguen
        // funcionando en memoria durante la sesión actual.
    }
}

let reclamosEnMemoria: Reclamo[] = leerAlmacenamiento()

function generarId(): string {
    return `reclamo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function crearReclamo(datos: {
    reclamanteId: string
    objetivoTipo: TipoObjetivoReclamo
    objetivoId: string
    motivo: MotivoReclamo
    descripcion: string
}): Reclamo {
    const ahora = new Date().toISOString()
    const nuevo: Reclamo = {
        id: generarId(),
        ...datos,
        estado: 'pendiente',
        creadoEn: ahora,
        actualizadoEn: ahora,
    }
    guardarAlmacenamiento([nuevo, ...reclamosEnMemoria])
    return nuevo
}

export function obtenerTodosLosReclamos(): Reclamo[] {
    return reclamosEnMemoria.slice().sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
}

export function obtenerReclamosPendientes(): Reclamo[] {
    return obtenerTodosLosReclamos().filter((r) => r.estado === 'pendiente')
}

export function obtenerReclamosPorUsuario(usuarioId: string): Reclamo[] {
    return obtenerTodosLosReclamos().filter((r) => r.reclamanteId === usuarioId)
}

export function obtenerCantidadReclamosPendientes(): number {
    return reclamosEnMemoria.filter((r) => r.estado === 'pendiente').length
}

function actualizarEstadoReclamo(id: string, estado: EstadoReclamo, notaAdmin?: string): void {
    const lista = reclamosEnMemoria.map((r) =>
        r.id === id
            ? { ...r, estado, notaAdmin: notaAdmin?.trim() || undefined, actualizadoEn: new Date().toISOString() }
            : r,
    )
    guardarAlmacenamiento(lista)

    const reclamo = lista.find((r) => r.id === id)
    if (!reclamo) return
    const objetivo = obtenerNombreObjetivoReclamo(reclamo)
    const mensaje =
        estado === 'resuelto'
            ? `Tu reclamo sobre "${objetivo}" fue resuelto.`
            : `Tu reclamo sobre "${objetivo}" fue descartado.`
    crearNotificacion(reclamo.reclamanteId, mensaje, estado === 'resuelto' ? 'exito' : 'error', '/mis-reclamos')
}

export function resolverReclamo(id: string, notaAdmin?: string): void {
    actualizarEstadoReclamo(id, 'resuelto', notaAdmin)
}

export function descartarReclamo(id: string, notaAdmin?: string): void {
    actualizarEstadoReclamo(id, 'descartado', notaAdmin)
}

export function obtenerNombreObjetivoReclamo(reclamo: Reclamo): string {
    if (reclamo.objetivoTipo === 'publicacion') {
        const publicacion = obtenerPublicacionPorId(reclamo.objetivoId)
        return publicacion ? publicacion.descripcion.slice(0, 50) : 'Publicación eliminada'
    }
    const usuario = obtenerUsuarioPorId(reclamo.objetivoId)
    return usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Usuario eliminado'
}

export function obtenerEtiquetaObjetivoReclamo(reclamo: Reclamo): string {
    if (reclamo.objetivoTipo === 'publicacion') return 'Publicación'
    const usuario = obtenerUsuarioPorId(reclamo.objetivoId)
    return usuario ? ETIQUETAS_ROL[usuario.rol] : 'Usuario'
}
