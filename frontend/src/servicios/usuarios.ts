import { api } from './api'
import type { EstadoCuenta, Rol, SesionUsuario } from '../types/usuario'

export interface UsuarioApi {
    id: number
    nombre: string
    apellido: string
    celular: string
    correo: string
    rol: Rol
    razon_social: string | null
    estado_cuenta: EstadoCuenta
    motivo_suspension: string | null
}

export function adaptarUsuario(usuario: UsuarioApi): SesionUsuario {
    return {
        id: String(usuario.id),
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        celular: usuario.celular,
        correo: usuario.correo,
        rol: usuario.rol,
        razonSocial: usuario.razon_social ?? undefined,
        estadoCuenta: usuario.estado_cuenta,
        motivoSuspension: usuario.motivo_suspension ?? undefined,
    }
}

export async function ingresar(correo: string, contrasena: string) {
    const { data } = await api.post<UsuarioApi>('/auth/login/', { correo, contrasena })
    return adaptarUsuario(data)
}

export interface DatosRegistro {
    nombre: string
    apellido: string
    celular: string
    correo: string
    contrasena: string
    rol: Exclude<Rol, 'administrador'>
    razonSocial?: string
}

export async function registrar({ razonSocial, ...datos }: DatosRegistro) {
    const { data } = await api.post<UsuarioApi>('/auth/registro/', { ...datos, razon_social: razonSocial })
    return adaptarUsuario(data)
}

export async function obtenerPerfil() {
    const { data } = await api.get<UsuarioApi>('/auth/perfil/')
    return adaptarUsuario(data)
}

export interface CambiosPerfil {
    nombre: string
    apellido: string
    celular: string
    razonSocial?: string
}

export async function actualizarPerfil({ razonSocial, ...cambios }: CambiosPerfil) {
    const cuerpo = razonSocial === undefined ? cambios : { ...cambios, razon_social: razonSocial }
    const { data } = await api.patch<UsuarioApi>('/auth/perfil/', cuerpo)
    return adaptarUsuario(data)
}

export async function solicitarRecuperacion(correo: string) {
    const { data } = await api.post<{ detail: string }>('/auth/recuperar/', { correo })
    return data.detail
}

export async function confirmarRecuperacion(uid: string, token: string, nuevaContrasena: string) {
    const { data } = await api.post<{ detail: string }>('/auth/recuperar/confirmar/', {
        uid,
        token,
        nueva_contrasena: nuevaContrasena,
    })
    return data.detail
}

export async function salir() {
    await api.post('/auth/logout/')
}
