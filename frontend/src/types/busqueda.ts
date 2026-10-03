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
    estado: EstadoBusqueda
    creadaEn: string
    actualizadaEn: string
}

export type BusquedaFormData = Omit<
    BusquedaActiva,
    'id' | 'usuarioId' | 'estado' | 'creadaEn' | 'actualizadaEn'
>
