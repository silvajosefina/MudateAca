import { useSyncExternalStore } from 'react'
import { isAxiosError } from 'axios'
import { EVENTO_SESION_VENCIDA } from './api'
import { obtenerPerfil, salir } from './usuarios'
import type { SesionUsuario } from '../types/usuario'

// La sesión real son las cookies httpOnly del backend. Acá solo se guardan los datos
// del perfil para dibujar la interfaz sin esperar a la API; nunca los tokens.
const STORAGE_KEY = 'mudateaca_sesion'

const suscriptores = new Set<() => void>()

function avisarCambio() {
    suscriptores.forEach((avisar) => avisar())
}

function guardar(sesion: SesionUsuario | null) {
    try {
        if (sesion) localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion))
        else localStorage.removeItem(STORAGE_KEY)
    } catch {
        // Sin almacenamiento (modo privado estricto): la sesión sigue en las cookies.
    }
    avisarCambio()
}

function leerCrudo() {
    try {
        return localStorage.getItem(STORAGE_KEY)
    } catch {
        return null
    }
}

export function iniciarSesion(usuario: SesionUsuario) {
    guardar(usuario)
}

export function obtenerSesion(): SesionUsuario | null {
    const datos = leerCrudo()
    if (!datos) return null
    try {
        return JSON.parse(datos) as SesionUsuario
    } catch {
        return null
    }
}

export function actualizarUsuarioSesion(cambios: Partial<SesionUsuario>) {
    const actual = obtenerSesion()
    if (actual) guardar({ ...actual, ...cambios })
}

export async function cerrarSesion() {
    try {
        await salir()
    } catch {
        // Si el backend no responde, igual se olvida la sesión en este navegador.
    } finally {
        guardar(null)
    }
}

// Indica si ya se confirmó con el backend la sesión guardada al abrir la aplicación.
// Mientras tanto, el perfil de localStorage puede ser de una sesión que ya venció.
let sesionValidada = false

// Al abrir la aplicación, confirma con el backend que la sesión guardada sigue vigente
// y trae los datos actualizados del perfil (por ejemplo, si el administrador la suspendió).
export async function validarSesion() {
    try {
        if (!obtenerSesion()) return
        guardar(await obtenerPerfil())
    } catch (error) {
        if (isAxiosError(error) && error.response?.status === 401) guardar(null)
    } finally {
        sesionValidada = true
        avisarCambio()
    }
}

function suscribir(avisar: () => void) {
    suscriptores.add(avisar)
    const alVencer = () => guardar(null)
    window.addEventListener(EVENTO_SESION_VENCIDA, alVencer)
    window.addEventListener('storage', avisar)
    return () => {
        suscriptores.delete(avisar)
        window.removeEventListener(EVENTO_SESION_VENCIDA, alVencer)
        window.removeEventListener('storage', avisar)
    }
}

// Hace que el componente se vuelva a dibujar cuando se inicia, cambia o vence la sesión.
export function useSesion() {
    useSyncExternalStore(suscribir, leerCrudo)
    return obtenerSesion()
}

// Devuelve true cuando terminó la validación inicial; antes de eso no conviene decidir
// a qué pantalla llevar al usuario según su rol.
export function useSesionValidada() {
    return useSyncExternalStore(suscribir, () => sesionValidada)
}
