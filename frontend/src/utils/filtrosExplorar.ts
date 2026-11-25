import type { ModalidadAlquiler, TipoInmueble } from '../types/publicacion'

export interface Filtros {
    ubicacion: string
    modalidad: ModalidadAlquiler | 'todas'
    tipoInmueble: TipoInmueble | 'todos'
    precioMin: number
    precioMax: number
    ambientesMin: number
    dormitoriosMin: number
    amueblado: boolean
    serviciosIncluidos: boolean
    aceptaMascotas: boolean
    aptoEstudiantes: boolean
    fechaDeseadaDesde: string
    fechaDeseadaHasta: string
    // Noches de estadía buscadas (0 = sin indicar). Solo aplica a alquileres temporarios.
    duracionEstadia: number
}

export const FILTROS_INICIALES: Filtros = {
    ubicacion: '',
    modalidad: 'todas',
    tipoInmueble: 'todos',
    precioMin: 0,
    precioMax: 0,
    ambientesMin: 0,
    dormitoriosMin: 0,
    amueblado: false,
    serviciosIncluidos: false,
    aceptaMascotas: false,
    aptoEstudiantes: false,
    fechaDeseadaDesde: '',
    fechaDeseadaHasta: '',
    duracionEstadia: 0,
}

export function filtrosDesdeQuery(params: URLSearchParams): Filtros {
    const modalidad = params.get('modalidad')
    const tipoInmueble = params.get('tipoInmueble')
    return {
        ubicacion: params.get('ubicacion') ?? '',
        modalidad: modalidad === 'residencial' || modalidad === 'temporario' ? modalidad : 'todas',
        tipoInmueble:
            tipoInmueble === 'casa' || tipoInmueble === 'departamento' || tipoInmueble === 'habitacion' || tipoInmueble === 'residencia'
                ? tipoInmueble
                : 'todos',
        precioMin: Number(params.get('precioMin')) || 0,
        precioMax: Number(params.get('precioMax')) || 0,
        ambientesMin: Number(params.get('ambientesMin')) || 0,
        dormitoriosMin: Number(params.get('dormitoriosMin')) || 0,
        amueblado: params.get('amueblado') === '1',
        serviciosIncluidos: params.get('serviciosIncluidos') === '1',
        aceptaMascotas: params.get('aceptaMascotas') === '1',
        aptoEstudiantes: params.get('aptoEstudiantes') === '1',
        fechaDeseadaDesde: params.get('fechaDeseadaDesde') ?? '',
        fechaDeseadaHasta: params.get('fechaDeseadaHasta') ?? '',
        duracionEstadia: Number(params.get('duracionEstadia')) || 0,
    }
}
