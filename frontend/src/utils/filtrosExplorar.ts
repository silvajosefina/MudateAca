import type { ModalidadAlquiler, Publicacion, TipoInmueble } from '../types/publicacion'

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
    }
}

export function coincideConFiltros(publicacion: Publicacion, filtros: Filtros): boolean {
    if (
        filtros.ubicacion.trim() &&
        !publicacion.ubicacion.toLowerCase().includes(filtros.ubicacion.trim().toLowerCase())
    ) {
        return false
    }
    if (filtros.modalidad !== 'todas' && publicacion.modalidad !== filtros.modalidad) return false
    if (filtros.tipoInmueble !== 'todos' && publicacion.tipoInmueble !== filtros.tipoInmueble) return false
    if (filtros.precioMin && publicacion.precio < filtros.precioMin) return false
    if (filtros.precioMax && publicacion.precio > filtros.precioMax) return false
    if (filtros.ambientesMin && publicacion.ambientes < filtros.ambientesMin) return false
    if (filtros.dormitoriosMin && publicacion.dormitorios < filtros.dormitoriosMin) return false
    if (filtros.amueblado && !publicacion.amueblado) return false
    if (filtros.serviciosIncluidos && !publicacion.serviciosIncluidos) return false
    if (filtros.aceptaMascotas && !publicacion.aceptaMascotas) return false
    if (filtros.aptoEstudiantes && !publicacion.aptoEstudiantes) return false

    if (publicacion.modalidad === 'temporario' && (filtros.fechaDeseadaDesde || filtros.fechaDeseadaHasta)) {
        if (
            filtros.fechaDeseadaDesde &&
            publicacion.disponibleHasta &&
            filtros.fechaDeseadaDesde > publicacion.disponibleHasta
        ) {
            return false
        }
        if (filtros.fechaDeseadaHasta && publicacion.disponibleDesde > filtros.fechaDeseadaHasta) {
            return false
        }
    }

    return true
}
