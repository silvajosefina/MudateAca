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
