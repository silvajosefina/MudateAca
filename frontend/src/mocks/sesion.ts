import type { SesionUsuario, Usuario } from '../types/usuario'

const STORAGE_KEY = 'mudateaca_sesion'

export function iniciarSesion(usuario: Usuario) {
    const sesion: SesionUsuario = {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        correo: usuario.correo,
        rol: usuario.rol,
        estadoVerificacion: usuario.estadoVerificacion,
        motivoRechazo: usuario.motivoRechazo,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion))
}

export function obtenerSesion(): SesionUsuario | null {
    const datos = localStorage.getItem(STORAGE_KEY)
    if (!datos) return null
    try {
        return JSON.parse(datos) as SesionUsuario
    } catch {
        return null
    }
}

export function cerrarSesion() {
    localStorage.removeItem(STORAGE_KEY)
}

export function actualizarUsuarioSesion(cambios: Partial<SesionUsuario>) {
    const actual = obtenerSesion()
    if (!actual) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...actual, ...cambios }))
}
