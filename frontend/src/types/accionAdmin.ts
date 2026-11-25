export type AccionConMotivo =
    | 'rechazar_publicacion'
    | 'suspender_usuario'
    | 'solicitar_modificaciones'
    | 'mantener_observada'
    | 'ocultar_publicacion'

export type SolicitudConMotivo = { accion: AccionConMotivo; id: string; nombre: string }

export const ETIQUETAS_ACCION_MOTIVO: Record<
    AccionConMotivo,
    {
        titulo: (nombre: string) => string
        etiquetaMotivo: string
        textoBoton: string
        placeholder: string
        // Solo las acciones realmente destructivas/negativas se pintan en rojo;
        // "solicitar modificaciones" es un pedido, no un rechazo.
        peligroso: boolean
    }
> = {
    rechazar_publicacion: {
        titulo: () => 'Rechazar publicación',
        etiquetaMotivo: 'Motivo del rechazo',
        textoBoton: 'Rechazar',
        placeholder: 'Explicá el motivo del rechazo para que la persona pueda corregirlo.',
        peligroso: true,
    },
    suspender_usuario: {
        titulo: (nombre) => `Suspender a ${nombre}`,
        etiquetaMotivo: 'Motivo de la suspensión',
        textoBoton: 'Suspender',
        placeholder: 'Explicá por qué se suspende la cuenta.',
        peligroso: true,
    },
    solicitar_modificaciones: {
        titulo: () => 'Solicitar modificaciones',
        etiquetaMotivo: '¿Qué debe corregir el propietario?',
        textoBoton: 'Enviar solicitud',
        placeholder: 'Detallá qué hay que modificar para que la publicación pueda aprobarse.',
        peligroso: false,
    },
    mantener_observada: {
        titulo: () => 'Mantener observada',
        etiquetaMotivo: '¿Qué sigue faltando corregir?',
        textoBoton: 'Mantener observada',
        placeholder: 'Contale al propietario qué sigue pendiente para poder aprobarla.',
        peligroso: false,
    },
    ocultar_publicacion: {
        titulo: () => 'Ocultar publicación',
        etiquetaMotivo: 'Motivo del ocultamiento',
        textoBoton: 'Ocultar',
        placeholder: 'Explicá por qué se oculta la publicación. El propietario va a ver este motivo.',
        peligroso: true,
    },
}
