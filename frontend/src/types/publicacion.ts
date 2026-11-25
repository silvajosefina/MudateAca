import type { SesionUsuario } from './usuario'

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
    | 'oculta'

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
    oculta: { texto: 'Oculta', clase: 'bg-danger-subtle text-danger' },
}

export type TipoDocumentoVerificacionPublicacion =
    | 'factura_servicio'
    | 'impuesto'
    | 'documentacion_propiedad'
    | 'matricula_corredor'
    | 'constancia_inscripcion'
    | 'poder_representacion'

export const ETIQUETAS_DOCUMENTO_VERIFICACION: Record<TipoDocumentoVerificacionPublicacion, string> = {
    factura_servicio: 'Factura de un servicio asociada al domicilio',
    impuesto: 'Impuesto correspondiente al inmueble',
    documentacion_propiedad: 'Documentación de propiedad',
    matricula_corredor: 'Matrícula de corredor/a inmobiliario/a',
    constancia_inscripcion: 'Constancia de inscripción o CUIT de la inmobiliaria',
    poder_representacion: 'Poder o autorización de representación del propietario',
}

export type TipoEventoModeracion =
    | 'rechazo'
    | 'solicitud_modificacion'
    | 'moderacion_automatica'
    | 'mantener_observada'
    | 'ocultamiento'

export const ETIQUETAS_EVENTO_MODERACION: Record<TipoEventoModeracion, { texto: string; clase: string }> = {
    rechazo: { texto: 'Rechazada', clase: 'bg-danger-subtle text-danger' },
    solicitud_modificacion: { texto: 'Modificaciones solicitadas', clase: 'bg-warning-subtle text-warning' },
    moderacion_automatica: { texto: 'Observada por la moderación automática', clase: 'bg-warning-subtle text-warning' },
    mantener_observada: { texto: 'Se mantiene observada', clase: 'bg-warning-subtle text-warning' },
    ocultamiento: { texto: 'Ocultada por la administración', clase: 'bg-danger-subtle text-danger' },
}

// RF-10: el backend decide qué acciones admite cada estado y el panel solo las muestra.
export type AccionPublicacion = 'editar' | 'pausar' | 'reactivar' | 'reservar' | 'marcar_alquilada' | 'eliminar'

// RF-21: quién publica, sin datos de contacto (el contacto es por el chat interno).
export interface Anunciante {
    id: string
    nombre: string
    apellido: string
    razonSocial?: string
    rol: 'propietario' | 'inmobiliaria' | 'interesado' | 'administrador'
}

export interface EventoModeracion {
    id: string
    publicacionId: string
    tipo: TipoEventoModeracion
    nota: string
    fecha: string
}

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
    // Mismo orden que fotos: permite indicar cuáles quitar al editar.
    idsFotos?: string[]
    expensas?: number
    serviciosIncluidos: boolean
    amueblado: boolean
    aceptaMascotas: boolean
    aptoEstudiantes: boolean
    requisitos?: string
    duracionMinimaDias?: number
    estado: EstadoPublicacion
    anunciante?: Anunciante
    // Solo para el administrador: datos de contacto y estado de la cuenta del dueño.
    propietarioDetalle?: SesionUsuario
    tipoDocumentoVerificacion?: TipoDocumentoVerificacionPublicacion
    nombreArchivoVerificacion?: string
    urlArchivoVerificacion?: string
    motivoRechazoVerificacion?: string
    notaModeracion?: string
    motivoOcultamiento?: string
    alquiladaEn?: string
    eventosModeracion?: EventoModeracion[]
    acciones?: AccionPublicacion[]
    creadaEn: string
    actualizadaEn: string
}

export type PublicacionFormData = Omit<
    Publicacion,
    | 'id'
    | 'propietarioId'
    | 'estado'
    | 'creadaEn'
    | 'actualizadaEn'
    | 'motivoRechazoVerificacion'
    | 'anunciante'
    | 'propietarioDetalle'
    | 'eventosModeracion'
    | 'acciones'
> & {
    // Documento nuevo elegido en el formulario; el ya guardado se conserva si no se cambia.
    archivoVerificacion?: File
}
