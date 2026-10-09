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
