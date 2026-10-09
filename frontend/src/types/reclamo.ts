export type TipoObjetivoReclamo = 'publicacion' | 'usuario'
export type EstadoReclamo = 'pendiente' | 'resuelto' | 'descartado'

export type MotivoReclamoPublicacion =
    | 'enganosa'
    | 'duplicada'
    | 'no_existe'
    | 'datos_falsos'
    | 'otro'

export type MotivoReclamoUsuario =
    | 'conducta_inapropiada'
    | 'no_se_presento'
    | 'posible_estafa'
    | 'otro'

export type MotivoReclamo = MotivoReclamoPublicacion | MotivoReclamoUsuario

export const ETIQUETAS_MOTIVO_RECLAMO: Record<MotivoReclamo, string> = {
    enganosa: 'La publicación es engañosa',
    duplicada: 'Publicación duplicada',
    no_existe: 'La propiedad no existe',
    datos_falsos: 'Datos falsos',
    conducta_inapropiada: 'Conducta inapropiada',
    no_se_presento: 'No se presentó a una visita/encuentro acordado',
    posible_estafa: 'Posible estafa',
    otro: 'Otro motivo',
}

export const ETIQUETAS_ESTADO_RECLAMO: Record<EstadoReclamo, { texto: string; clase: string }> = {
    pendiente: { texto: 'Pendiente', clase: 'bg-warning-subtle text-warning' },
    resuelto: { texto: 'Resuelto', clase: 'bg-accent-subtle text-accent' },
    descartado: { texto: 'Descartado', clase: 'bg-surface-hover text-muted' },
}

export interface Reclamo {
    id: string
    reclamanteId: string
    objetivoTipo: TipoObjetivoReclamo
    objetivoId: string
    motivo: MotivoReclamo
    descripcion: string
    estado: EstadoReclamo
    notaAdmin?: string
    creadoEn: string
    actualizadoEn: string
}
