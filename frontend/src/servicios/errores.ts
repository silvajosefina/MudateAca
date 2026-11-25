import { isAxiosError } from 'axios'

type CuerpoDeError = Record<string, unknown> | string[] | string | undefined

function primerMensaje(valor: unknown): string | undefined {
    if (typeof valor === 'string') return valor
    if (Array.isArray(valor)) return primerMensaje(valor[0])
    return undefined
}

// Errores por campo de DRF ({"correo": ["..."]}), con el primer mensaje de cada uno.
export function erroresDeCampos(error: unknown): Record<string, string> {
    if (!isAxiosError(error)) return {}
    const cuerpo = error.response?.data as CuerpoDeError
    if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) return {}

    const errores: Record<string, string> = {}
    for (const [campo, valor] of Object.entries(cuerpo)) {
        const mensaje = primerMensaje(valor)
        if (mensaje) errores[campo] = mensaje
    }
    return errores
}

// Un mensaje general para mostrar al usuario cuando el error no es de un campo puntual.
export function mensajeDeError(error: unknown, porDefecto = 'Ocurrió un error. Intentá de nuevo.'): string {
    if (!isAxiosError(error)) return porDefecto
    if (!error.response) return 'No se pudo conectar con el servidor. Revisá tu conexión.'

    const cuerpo = error.response.data as CuerpoDeError
    if (typeof cuerpo === 'string' || Array.isArray(cuerpo)) return primerMensaje(cuerpo) ?? porDefecto

    const campos = erroresDeCampos(error)
    return campos.detail ?? campos.non_field_errors ?? Object.values(campos)[0] ?? porDefecto
}
