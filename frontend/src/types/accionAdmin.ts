export type AccionConMotivo =
    | 'rechazar_inmobiliaria'
    | 'rechazar_publicacion'
    | 'suspender_usuario'
    | 'solicitar_modificaciones'
    | 'ocultar_publicacion'

export type SolicitudConMotivo = { accion: AccionConMotivo; id: string; nombre: string }

export const ETIQUETAS_ACCION_MOTIVO: Record<
    AccionConMotivo,
    { titulo: (nombre: string) => string; etiquetaMotivo: string; textoBoton: string; placeholder: string }
> = {
    rechazar_inmobiliaria: {
        titulo: (nombre) => `Rechazar ${nombre}`,
        etiquetaMotivo: 'Motivo del rechazo',
        textoBoton: 'Rechazar',
        placeholder: 'Explicá el motivo del rechazo para que la persona pueda corregirlo.',
    },
    rechazar_publicacion: {
        titulo: () => 'Rechazar publicación',
        etiquetaMotivo: 'Motivo del rechazo',
        textoBoton: 'Rechazar',
        placeholder: 'Explicá el motivo del rechazo para que la persona pueda corregirlo.',
    },
    suspender_usuario: {
        titulo: (nombre) => `Suspender a ${nombre}`,
        etiquetaMotivo: 'Motivo de la suspensión',
        textoBoton: 'Suspender',
        placeholder: 'Explicá por qué se suspende la cuenta.',
    },
    solicitar_modificaciones: {
        titulo: () => 'Solicitar modificaciones',
        etiquetaMotivo: '¿Qué debe corregir el propietario?',
        textoBoton: 'Enviar solicitud',
        placeholder: 'Detallá qué hay que modificar para que la publicación pueda aprobarse.',
    },
    ocultar_publicacion: {
        titulo: () => 'Ocultar publicación',
        etiquetaMotivo: 'Motivo para ocultarla',
        textoBoton: 'Ocultar',
        placeholder: 'Explicá por qué se oculta esta publicación.',
    },
}
