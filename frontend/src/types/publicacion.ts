export type TipoInmueble = 'casa' | 'departamento' | 'habitacion' | 'residencia'
export type ModalidadAlquiler = 'residencial' | 'temporario'

export type EstadoPublicacion =
    | 'pendiente_moderacion'
    | 'activa'
    | 'pausada'
    | 'observada'
    | 'reservada'
    | 'alquilada'
    | 'archivada'
    | 'eliminada'

export interface Publicacion {
    id: string
    propietarioId: string
    tipoInmueble: TipoInmueble
    modalidad: ModalidadAlquiler
    descripcion: string
    precio: number
    ubicacion: string
    ambientes: number
    dormitorios: number
    disponibleDesde: string
    fotos: string[]
    expensas?: number
    serviciosIncluidos: boolean
    amueblado: boolean
    aceptaMascotas: boolean
    aptoEstudiantes: boolean
    requisitos?: string
    duracionMinima?: string
    fechaIngreso?: string
    fechaSalida?: string
    estado: EstadoPublicacion
    creadaEn: string
    actualizadaEn: string
}

export type PublicacionFormData = Omit<
    Publicacion,
    'id' | 'propietarioId' | 'estado' | 'creadaEn' | 'actualizadaEn'
>
