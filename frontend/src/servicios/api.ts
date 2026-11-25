import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

// El frontend y la API comparten dominio: en producción Nginx deriva /api al backend,
// y en desarrollo lo hace el proxy de Vite. Las cookies httpOnly viajan solas.
export const api = axios.create({ baseURL: '/api', withCredentials: true })

export const EVENTO_SESION_VENCIDA = 'mudateaca:sesion-vencida'

const RUTAS_SIN_RENOVACION = ['/auth/login/', '/auth/refresh/', '/auth/registro/']

type ConfigConReintento = InternalAxiosRequestConfig & { _reintentada?: boolean }

let renovacionEnCurso: Promise<void> | null = null

function renovarSesion() {
    // Si varias consultas vencen a la vez, comparten una sola renovación:
    // el backend invalida el refresh token después de usarlo.
    renovacionEnCurso ??= api
        .post('/auth/refresh/')
        .then(() => undefined)
        .finally(() => {
            renovacionEnCurso = null
        })
    return renovacionEnCurso
}

api.interceptors.response.use(
    (respuesta) => respuesta,
    async (error: AxiosError) => {
        const config = error.config as ConfigConReintento | undefined
        const sinRenovacion = RUTAS_SIN_RENOVACION.some((ruta) => config?.url?.startsWith(ruta))

        if (error.response?.status !== 401 || !config || config._reintentada || sinRenovacion) {
            throw error
        }

        config._reintentada = true
        try {
            await renovarSesion()
        } catch {
            window.dispatchEvent(new Event(EVENTO_SESION_VENCIDA))
            throw error
        }
        return api(config)
    },
)
