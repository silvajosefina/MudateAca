import type { BusquedaActiva, BusquedaFormData, EstadoBusqueda } from '../types/busqueda'
import type { Publicacion } from '../types/publicacion'
import { obtenerPublicacionesActivas } from './publicaciones'

function generarId(): string {
    return `bus_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

const AHORA_DEMANDA = Date.now()
function haceDias(dias: number): string {
    return new Date(AHORA_DEMANDA - dias * 86400000).toISOString()
}

interface SemillaBusqueda {
    tipoInmueble: BusquedaActiva['tipoInmueble']
    modalidad?: BusquedaActiva['modalidad']
    precioMin?: number
    precioMax?: number
    ambientesMin?: number
    dormitoriosMin?: number
    ubicacion?: string
    amueblado?: boolean
    serviciosIncluidos?: boolean
    aceptaMascotas?: boolean
    aptoEstudiantes?: boolean
    diasAtras: number
}

// Búsquedas de otros usuarios simuladas para que el panel de demanda tenga datos
// representativos antes de contar con un backend real.
const SEMILLAS_DEMANDA: SemillaBusqueda[] = [
    { tipoInmueble: 'departamento', precioMin: 120000, precioMax: 220000, aceptaMascotas: true, diasAtras: 1 },
    { tipoInmueble: 'departamento', precioMin: 150000, precioMax: 250000, aptoEstudiantes: true, diasAtras: 2 },
    { tipoInmueble: 'departamento', precioMin: 100000, precioMax: 180000, amueblado: true, diasAtras: 3 },
    { tipoInmueble: 'casa', precioMin: 200000, precioMax: 320000, aceptaMascotas: true, diasAtras: 3 },
    { tipoInmueble: 'departamento', precioMin: 90000, precioMax: 150000, aptoEstudiantes: true, diasAtras: 5 },
    { tipoInmueble: 'habitacion', precioMin: 60000, precioMax: 110000, aptoEstudiantes: true, diasAtras: 6 },
    { tipoInmueble: 'casa', precioMin: 250000, precioMax: 400000, amueblado: true, diasAtras: 7 },
    { tipoInmueble: 'departamento', precioMin: 130000, precioMax: 210000, serviciosIncluidos: true, diasAtras: 8 },
    { tipoInmueble: 'residencia', precioMin: 80000, precioMax: 140000, aptoEstudiantes: true, diasAtras: 9 },
    { tipoInmueble: 'departamento', precioMin: 160000, precioMax: 260000, aceptaMascotas: true, diasAtras: 11 },
    { tipoInmueble: 'habitacion', precioMin: 55000, precioMax: 95000, serviciosIncluidos: true, diasAtras: 12 },
    { tipoInmueble: 'casa', precioMin: 180000, precioMax: 300000, aceptaMascotas: true, diasAtras: 14 },
    { tipoInmueble: 'departamento', precioMin: 110000, precioMax: 190000, amueblado: true, diasAtras: 15 },
    { tipoInmueble: 'departamento', precioMin: 140000, precioMax: 230000, diasAtras: 17 },
    { tipoInmueble: 'residencia', precioMin: 90000, precioMax: 150000, aptoEstudiantes: true, diasAtras: 18 },
    { tipoInmueble: 'casa', precioMin: 220000, precioMax: 350000, diasAtras: 20 },
    { tipoInmueble: 'departamento', precioMin: 95000, precioMax: 160000, serviciosIncluidos: true, diasAtras: 22 },
    { tipoInmueble: 'habitacion', precioMin: 50000, precioMax: 90000, aptoEstudiantes: true, diasAtras: 24 },
    { tipoInmueble: 'departamento', precioMin: 170000, precioMax: 280000, aceptaMascotas: true, diasAtras: 26 },
    { tipoInmueble: 'casa', precioMin: 240000, precioMax: 380000, amueblado: true, diasAtras: 27 },
]

const BUSQUEDAS_DEMANDA_INICIALES: BusquedaActiva[] = SEMILLAS_DEMANDA.map((semilla, indice) => ({
    id: `bus_demanda_${indice + 1}`,
    usuarioId: `usuario_demo_${(indice % 8) + 1}`,
    nombre: 'Búsqueda de la plataforma',
    modalidad: semilla.modalidad ?? 'residencial',
    tipoInmueble: semilla.tipoInmueble,
    precioMin: semilla.precioMin ?? 0,
    precioMax: semilla.precioMax ?? 0,
    ambientesMin: semilla.ambientesMin ?? 0,
    dormitoriosMin: semilla.dormitoriosMin ?? 0,
    ubicacion: semilla.ubicacion ?? '',
    amueblado: semilla.amueblado ?? false,
    serviciosIncluidos: semilla.serviciosIncluidos ?? false,
    aceptaMascotas: semilla.aceptaMascotas ?? false,
    aptoEstudiantes: semilla.aptoEstudiantes ?? false,
    fechaDeseadaDesde: '',
    fechaDeseadaHasta: '',
    estado: 'activa',
    creadaEn: haceDias(semilla.diasAtras),
    actualizadaEn: haceDias(semilla.diasAtras),
}))

let busquedasEnMemoria: BusquedaActiva[] = BUSQUEDAS_DEMANDA_INICIALES

function leerAlmacenamiento(): BusquedaActiva[] {
    return busquedasEnMemoria
}

function guardarAlmacenamiento(lista: BusquedaActiva[]) {
    busquedasEnMemoria = lista
}

export function obtenerBusquedasDeUsuario(usuarioId: string): BusquedaActiva[] {
    return leerAlmacenamiento()
        .filter((b) => b.usuarioId === usuarioId)
        .sort((a, b) => b.actualizadaEn.localeCompare(a.actualizadaEn))
}

export function crearBusqueda(datos: BusquedaFormData, usuarioId: string): BusquedaActiva {
    const ahora = new Date().toISOString()
    const nueva: BusquedaActiva = {
        ...datos,
        id: generarId(),
        usuarioId,
        estado: 'activa',
        creadaEn: ahora,
        actualizadaEn: ahora,
    }
    guardarAlmacenamiento([nueva, ...leerAlmacenamiento()])
    return nueva
}

export function actualizarBusqueda(
    id: string,
    datos: BusquedaFormData,
    usuarioId: string,
): BusquedaActiva | undefined {
    const lista = leerAlmacenamiento()
    const indice = lista.findIndex((b) => b.id === id && b.usuarioId === usuarioId)
    if (indice === -1) return undefined

    const actualizada: BusquedaActiva = {
        ...lista[indice],
        ...datos,
        actualizadaEn: new Date().toISOString(),
    }
    lista[indice] = actualizada
    guardarAlmacenamiento(lista)
    return actualizada
}

export function cambiarEstadoBusqueda(id: string, usuarioId: string, nuevoEstado: EstadoBusqueda): void {
    const lista = leerAlmacenamiento()
    const indice = lista.findIndex((b) => b.id === id && b.usuarioId === usuarioId)
    if (indice === -1) return
    lista[indice] = { ...lista[indice], estado: nuevoEstado, actualizadaEn: new Date().toISOString() }
    guardarAlmacenamiento(lista)
}

export function eliminarBusqueda(id: string, usuarioId: string): void {
    guardarAlmacenamiento(leerAlmacenamiento().filter((b) => !(b.id === id && b.usuarioId === usuarioId)))
}

export function calcularCompatibilidad(busqueda: BusquedaActiva, publicacion: Publicacion): number {
    const criterios: boolean[] = []

    if (busqueda.modalidad !== 'todas') {
        criterios.push(publicacion.modalidad === busqueda.modalidad)
    }
    if (busqueda.tipoInmueble !== 'todos') {
        criterios.push(publicacion.tipoInmueble === busqueda.tipoInmueble)
    }
    if (busqueda.precioMin) {
        criterios.push(publicacion.precio >= busqueda.precioMin)
    }
    if (busqueda.precioMax) {
        criterios.push(publicacion.precio <= busqueda.precioMax)
    }
    if (busqueda.ambientesMin) {
        criterios.push(publicacion.ambientes >= busqueda.ambientesMin)
    }
    if (busqueda.dormitoriosMin) {
        criterios.push(publicacion.dormitorios >= busqueda.dormitoriosMin)
    }
    if (busqueda.ubicacion.trim()) {
        criterios.push(publicacion.ubicacion.toLowerCase().includes(busqueda.ubicacion.trim().toLowerCase()))
    }
    if (busqueda.amueblado) {
        criterios.push(publicacion.amueblado)
    }
    if (busqueda.serviciosIncluidos) {
        criterios.push(publicacion.serviciosIncluidos)
    }
    if (busqueda.aceptaMascotas) {
        criterios.push(publicacion.aceptaMascotas)
    }
    if (busqueda.aptoEstudiantes) {
        criterios.push(publicacion.aptoEstudiantes)
    }
    if (busqueda.modalidad === 'temporario' && (busqueda.fechaDeseadaDesde || busqueda.fechaDeseadaHasta)) {
        const cubreDesde = !busqueda.fechaDeseadaDesde || !publicacion.disponibleHasta || busqueda.fechaDeseadaDesde <= publicacion.disponibleHasta
        const cubreHasta = !busqueda.fechaDeseadaHasta || publicacion.disponibleDesde <= busqueda.fechaDeseadaHasta
        criterios.push(cubreDesde && cubreHasta)
    }

    if (criterios.length === 0) return 100

    const cumplidos = criterios.filter(Boolean).length
    return Math.round((cumplidos / criterios.length) * 100)
}

export interface Coincidencia {
    publicacion: Publicacion
    porcentaje: number
}

export function obtenerCoincidenciasDeBusqueda(busqueda: BusquedaActiva): Coincidencia[] {
    return obtenerPublicacionesActivas()
        .map((publicacion) => ({ publicacion, porcentaje: calcularCompatibilidad(busqueda, publicacion) }))
        .filter((c) => c.porcentaje >= 50)
        .sort((a, b) => b.porcentaje - a.porcentaje)
}

export function contarCoincidenciasDePublicacion(publicacion: Publicacion, todasLasBusquedas: BusquedaActiva[]): number {
    return todasLasBusquedas.filter(
        (b) => b.estado === 'activa' && calcularCompatibilidad(b, publicacion) >= 50,
    ).length
}

export function obtenerTodasLasBusquedasActivas(): BusquedaActiva[] {
    return leerAlmacenamiento().filter((b) => b.estado === 'activa')
}
