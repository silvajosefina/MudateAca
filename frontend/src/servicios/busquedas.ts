import { api } from './api'
import { adaptarPublicacion, type PublicacionApi } from './publicaciones'
import type { BusquedaActiva, BusquedaFormData, EstadoBusqueda } from '../types/busqueda'
import type { ModalidadAlquiler, Publicacion, TipoInmueble } from '../types/publicacion'

interface BusquedaApi {
    id: number
    nombre: string | null
    modalidad: ModalidadAlquiler | null
    tipo_inmueble: TipoInmueble | null
    precio_minimo: string | null
    precio_maximo: string | null
    ambientes_minimos: number | null
    dormitorios_minimos: number | null
    ubicacion: string | null
    amueblado: boolean | null
    servicios_incluidos: boolean | null
    acepta_mascotas: boolean | null
    apto_estudiantes: boolean | null
    fecha_ingreso: string | null
    fecha_salida: string | null
    duracion_estadia_dias: number | null
    estado: EstadoBusqueda
    cantidad_coincidencias: number
    creado_en: string
    actualizado_en: string
}

interface CoincidenciaApi {
    id: number
    nivel_compatibilidad: number
    publicacion: PublicacionApi
    creado_en: string
}

export interface Coincidencia {
    id: string
    nivelCompatibilidad: number
    publicacion: Publicacion
}

// En la API, "sin preferencia" es null; en el formulario es "todas", "todos", 0, false o ''.
function adaptarBusqueda(b: BusquedaApi): BusquedaActiva {
    return {
        id: String(b.id),
        usuarioId: '',
        nombre: b.nombre ?? '',
        modalidad: b.modalidad ?? 'todas',
        tipoInmueble: b.tipo_inmueble ?? 'todos',
        precioMin: Number(b.precio_minimo ?? 0),
        precioMax: Number(b.precio_maximo ?? 0),
        ambientesMin: b.ambientes_minimos ?? 0,
        dormitoriosMin: b.dormitorios_minimos ?? 0,
        ubicacion: b.ubicacion ?? '',
        amueblado: Boolean(b.amueblado),
        serviciosIncluidos: Boolean(b.servicios_incluidos),
        aceptaMascotas: Boolean(b.acepta_mascotas),
        aptoEstudiantes: Boolean(b.apto_estudiantes),
        fechaDeseadaDesde: b.fecha_ingreso ?? '',
        fechaDeseadaHasta: b.fecha_salida ?? '',
        duracionEstadia: b.duracion_estadia_dias ?? 0,
        estado: b.estado,
        cantidadCoincidencias: b.cantidad_coincidencias,
        creadaEn: b.creado_en,
        actualizadaEn: b.actualizado_en,
    }
}

export function cuerpoDeBusqueda(datos: BusquedaFormData) {
    const temporario = datos.modalidad === 'temporario'
    return {
        nombre: datos.nombre.trim() || null,
        modalidad: datos.modalidad === 'todas' ? null : datos.modalidad,
        tipo_inmueble: datos.tipoInmueble === 'todos' ? null : datos.tipoInmueble,
        precio_minimo: datos.precioMin || null,
        precio_maximo: datos.precioMax || null,
        ambientes_minimos: datos.ambientesMin || null,
        dormitorios_minimos: datos.dormitoriosMin || null,
        ubicacion: datos.ubicacion.trim() || null,
        amueblado: datos.amueblado || null,
        servicios_incluidos: datos.serviciosIncluidos || null,
        acepta_mascotas: datos.aceptaMascotas || null,
        apto_estudiantes: datos.aptoEstudiantes || null,
        fecha_ingreso: (temporario && datos.fechaDeseadaDesde) || null,
        fecha_salida: (temporario && datos.fechaDeseadaHasta) || null,
        duracion_estadia_dias: (temporario && datos.duracionEstadia) || null,
    }
}

export async function listarBusquedas() {
    const { data } = await api.get<BusquedaApi[]>('/busquedas/')
    return data.map(adaptarBusqueda)
}

export async function crearBusqueda(datos: BusquedaFormData) {
    const { data } = await api.post<BusquedaApi>('/busquedas/', cuerpoDeBusqueda(datos))
    return adaptarBusqueda(data)
}

export async function actualizarBusqueda(id: string, datos: BusquedaFormData) {
    const { data } = await api.patch<BusquedaApi>(`/busquedas/${id}/`, cuerpoDeBusqueda(datos))
    return adaptarBusqueda(data)
}

export async function cambiarEstadoBusqueda(id: string, estado: EstadoBusqueda) {
    const { data } = await api.post<BusquedaApi>(`/busquedas/${id}/estado/`, { estado })
    return adaptarBusqueda(data)
}

export async function eliminarBusqueda(id: string) {
    await api.delete(`/busquedas/${id}/`)
}

// RF-13: publicaciones compatibles, de mayor a menor nivel de compatibilidad.
export async function listarCoincidencias(id: string): Promise<Coincidencia[]> {
    const { data } = await api.get<CoincidenciaApi[]>(`/busquedas/${id}/coincidencias/`)
    return data.map((c) => ({
        id: String(c.id),
        nivelCompatibilidad: c.nivel_compatibilidad,
        publicacion: adaptarPublicacion(c.publicacion),
    }))
}
