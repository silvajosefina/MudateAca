import type { ModalidadAlquiler, TipoInmueble } from './publicacion'

export type EstadoBusqueda = 'activa' | 'pausada'

export interface BusquedaActiva {
    id: string
    usuarioId: string
    nombre: string
    modalidad: ModalidadAlquiler | 'todas'
    tipoInmueble: TipoInmueble | 'todos'
    precioMin: number
    precioMax: number
    ambientesMin: number
    dormitoriosMin: number
    ubicacion: string
    amueblado: boolean
    serviciosIncluidos: boolean
    aceptaMascotas: boolean
    aptoEstudiantes: boolean
    fechaDeseadaDesde: string
    fechaDeseadaHasta: string
    // Noches de estadía (0 = sin indicar). Solo aplica a alquileres temporarios.
    duracionEstadia: number
    estado: EstadoBusqueda
    // Publicaciones compatibles que la API calculó para esta búsqueda (RF-13).
    cantidadCoincidencias?: number
    creadaEn: string
    actualizadaEn: string
}

export type BusquedaFormData = Omit<
    BusquedaActiva,
    'id' | 'usuarioId' | 'estado' | 'creadaEn' | 'actualizadaEn' | 'cantidadCoincidencias'
>
