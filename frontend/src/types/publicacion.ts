export type TipoInmueble = 'casa' | 'departamento' | 'habitacion' | 'residencia'
export type ModalidadAlquiler = 'residencial' | 'temporario'

export const ETIQUETAS_TIPO_INMUEBLE: Record<TipoInmueble, string> = {
    casa: 'Casa',
    departamento: 'Departamento',
    habitacion: 'Habitación',
    residencia: 'Residencia',
}

export type EstadoPublicacion =
    | 'pendiente_moderacion'
    | 'activa'
    | 'pausada'
    | 'observada'
    | 'reservada'
    | 'rechazada'
    | 'alquilada'
    | 'archivada'
    | 'eliminada'

export const ETIQUETAS_ESTADO_PUBLICACION: Record<EstadoPublicacion, { texto: string; clase: string }> = {
    pendiente_moderacion: { texto: 'En revisión', clase: 'bg-warning-subtle text-warning' },
    activa: { texto: 'Activa', clase: 'bg-accent-subtle text-accent' },
    pausada: { texto: 'Pausada', clase: 'bg-warning-subtle text-warning' },
    observada: { texto: 'Observada', clase: 'bg-warning-subtle text-warning' },
    reservada: { texto: 'Reservada', clase: 'bg-surface-hover text-foreground' },
    rechazada: { texto: 'Rechazada', clase: 'bg-danger-subtle text-danger' },
    alquilada: { texto: 'Alquilada', clase: 'bg-highlight text-on-accent' },
    archivada: { texto: 'Archivada', clase: 'bg-surface-hover text-muted' },
    eliminada: { texto: 'Eliminada', clase: 'bg-danger-subtle text-danger' },
}

export type TipoDocumentoVerificacionPublicacion =
    | 'factura_servicio'
    | 'impuesto'
    | 'documentacion_propiedad'
    | 'matricula_corredor'
    | 'constancia_inscripcion'
    | 'poder_representacion'

export interface Publicacion {
    id: string
    propietarioId: string
    tipoInmueble: TipoInmueble
    modalidad: ModalidadAlquiler
    descripcion: string
    precio: number
    ubicacion: string
    lat?: number
    lng?: number
    ambientes: number
    dormitorios: number
    disponibleDesde: string
    disponibleHasta?: string
    fotos: string[]
    expensas?: number
    serviciosIncluidos: boolean
    amueblado: boolean
    aceptaMascotas: boolean
    aptoEstudiantes: boolean
    requisitos?: string
    duracionMinima?: string
    estado: EstadoPublicacion
    tipoDocumentoVerificacion?: TipoDocumentoVerificacionPublicacion
    nombreArchivoVerificacion?: string
    urlArchivoVerificacion?: string
    motivoRechazoVerificacion?: string
    notaModeracion?: string
    creadaEn: string
    actualizadaEn: string
}

export type PublicacionFormData = Omit<
    Publicacion,
    'id' | 'propietarioId' | 'estado' | 'creadaEn' | 'actualizadaEn' | 'motivoRechazoVerificacion'
>
