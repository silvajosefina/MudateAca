import { api } from './api'
import { adaptarPublicacion, type Pagina, type PublicacionApi } from './publicaciones'
import { adaptarReclamo, type ReclamoApi } from './reclamos'
import { adaptarUsuario, type UsuarioApi } from './usuarios'
import type { EstadoPublicacion, Publicacion } from '../types/publicacion'
import type { EstadoReclamo } from '../types/reclamo'
import type { EstadoCuenta, SesionUsuario } from '../types/usuario'

// ---- Usuarios (RF-20) ----

interface UsuarioAdministradoApi extends UsuarioApi {
    fecha_registro: string
    cantidad_publicaciones: number
    reclamos_recibidos: number
}

export interface UsuarioAdministrado extends SesionUsuario {
    fechaRegistro: string
    cantidadPublicaciones: number
    reclamosRecibidos: number
}

function adaptarUsuarioAdministrado(u: UsuarioAdministradoApi): UsuarioAdministrado {
    return {
        ...adaptarUsuario(u),
        fechaRegistro: u.fecha_registro,
        cantidadPublicaciones: u.cantidad_publicaciones,
        reclamosRecibidos: u.reclamos_recibidos,
    }
}

export interface PaginaUsuarios extends Pagina<UsuarioAdministrado> {
    totales: Partial<Record<EstadoCuenta, number>>
}

export async function listarUsuarios(
    estado: EstadoCuenta | null,
    pagina: number,
    busqueda = '',
): Promise<PaginaUsuarios> {
    const { data } = await api.get<Pagina<UsuarioAdministradoApi> & { totales: PaginaUsuarios['totales'] }>(
        '/usuarios/',
        { params: { pagina, ...(estado ? { estado } : {}), ...(busqueda ? { busqueda } : {}) } },
    )
    return { ...data, results: data.results.map(adaptarUsuarioAdministrado) }
}

export async function obtenerUsuarioAdministrado(id: string) {
    const { data } = await api.get<UsuarioAdministradoApi>(`/usuarios/${id}/`)
    return adaptarUsuarioAdministrado(data)
}

export async function suspenderUsuario(id: string, motivo: string) {
    const { data } = await api.post<UsuarioAdministradoApi>(`/usuarios/${id}/suspender/`, { motivo })
    return adaptarUsuarioAdministrado(data)
}

export async function reactivarUsuario(id: string) {
    const { data } = await api.post<UsuarioAdministradoApi>(`/usuarios/${id}/reactivar/`)
    return adaptarUsuarioAdministrado(data)
}

// ---- Moderación de publicaciones (RF-19) ----

export async function listarPublicacionesEnRevision(): Promise<Publicacion[]> {
    const { data } = await api.get<PublicacionApi[]>('/publicaciones/pendientes/')
    return data.map(adaptarPublicacion)
}

export interface PaginaPublicacionesAdministracion extends Pagina<Publicacion> {
    totales: Partial<Record<EstadoPublicacion, number>>
}

export async function listarPublicacionesAdministracion(
    estado: EstadoPublicacion | null,
    pagina: number,
): Promise<PaginaPublicacionesAdministracion> {
    const { data } = await api.get<Pagina<PublicacionApi> & { totales: PaginaPublicacionesAdministracion['totales'] }>(
        '/publicaciones/administracion/',
        { params: { pagina, ...(estado ? { estado } : {}) } },
    )
    return { ...data, results: data.results.map(adaptarPublicacion) }
}

// Rechazar, pedir cambios, mantener observada y ocultar exigen una nota, que queda en el historial.
export type AccionModeracion = 'aprobar' | 'mostrar' | 'rechazar' | 'solicitar-modificaciones' | 'mantener-observada' | 'ocultar'

export async function moderarPublicacion(id: string, accion: AccionModeracion, nota?: string) {
    const { data } = await api.post<PublicacionApi>(`/publicaciones/${id}/${accion}/`, nota ? { nota } : {})
    return adaptarPublicacion(data)
}

// ---- Reclamos (RF-18) ----

export async function listarReclamos() {
    const { data } = await api.get<ReclamoApi[]>('/reclamos/')
    return data.map(adaptarReclamo)
}

export async function cambiarEstadoReclamo(id: string, estado: EstadoReclamo, notaAdministrador?: string) {
    const { data } = await api.post<ReclamoApi>(`/reclamos/${id}/estado/`, {
        estado,
        ...(notaAdministrador !== undefined ? { nota_administrador: notaAdministrador } : {}),
    })
    return adaptarReclamo(data)
}
