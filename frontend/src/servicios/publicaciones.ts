import { api } from './api'
import type { Filtros } from '../utils/filtrosExplorar'
import type {
    AccionPublicacion,
    EstadoPublicacion,
    EventoModeracion,
    ModalidadAlquiler,
    Publicacion,
    PublicacionFormData,
    TipoDocumentoVerificacionPublicacion,
    TipoEventoModeracion,
    TipoInmueble,
} from '../types/publicacion'
import type { Rol } from '../types/usuario'

// ---- Forma de los datos que devuelve la API (snake_case) ----

interface FotoApi {
    id: number
    imagen: string
    orden: number
}

interface EventoModeracionApi {
    id: number
    tipo: TipoEventoModeracion
    nota: string
    creado_en: string
}

interface AnuncianteApi {
    id: number
    nombre: string
    apellido: string
    razon_social: string | null
    rol: Rol
}

export interface PublicacionApi {
    id: number
    propietario: AnuncianteApi
    tipo_inmueble: TipoInmueble
    modalidad: ModalidadAlquiler
    descripcion: string
    precio: string
    expensas: string | null
    ubicacion: string
    lat: number | null
    lng: number | null
    ambientes: number
    dormitorios: number
    amueblado: boolean
    servicios_incluidos: boolean
    acepta_mascotas: boolean
    apto_estudiantes: boolean
    requisitos: string
    duracion_minima_dias: number | null
    disponible_desde: string
    disponible_hasta: string | null
    estado: EstadoPublicacion
    fotos: FotoApi[]
    creado_en: string
    actualizado_en: string
    // Solo para el dueño y los administradores.
    alquilada_en?: string | null
    tipo_documento_verificacion?: TipoDocumentoVerificacionPublicacion | ''
    archivo_verificacion?: string | null
    motivo_rechazo_verificacion?: string
    nota_moderacion?: string
    motivo_ocultamiento?: string
    eventos_moderacion?: EventoModeracionApi[]
    acciones?: AccionPublicacion[]
}

export interface Pagina<T> {
    count: number
    next: string | null
    previous: string | null
    results: T[]
}

function textoOpcional(valor: string | null | undefined) {
    return valor ? valor : undefined
}

function adaptarEvento(evento: EventoModeracionApi, publicacionId: string): EventoModeracion {
    return { id: String(evento.id), publicacionId, tipo: evento.tipo, nota: evento.nota, fecha: evento.creado_en }
}

export function adaptarPublicacion(p: PublicacionApi): Publicacion {
    const id = String(p.id)
    const fotos = [...p.fotos].sort((a, b) => a.orden - b.orden)
    return {
        id,
        propietarioId: String(p.propietario.id),
        anunciante: {
            id: String(p.propietario.id),
            nombre: p.propietario.nombre,
            apellido: p.propietario.apellido,
            razonSocial: textoOpcional(p.propietario.razon_social),
            rol: p.propietario.rol,
        },
        tipoInmueble: p.tipo_inmueble,
        modalidad: p.modalidad,
        descripcion: p.descripcion,
        precio: Number(p.precio),
        expensas: p.expensas === null ? undefined : Number(p.expensas),
        ubicacion: p.ubicacion,
        // Los componentes del mapa distinguen "sin ubicación" con undefined, no con null.
        lat: p.lat ?? undefined,
        lng: p.lng ?? undefined,
        ambientes: p.ambientes,
        dormitorios: p.dormitorios,
        amueblado: p.amueblado,
        serviciosIncluidos: p.servicios_incluidos,
        aceptaMascotas: p.acepta_mascotas,
        aptoEstudiantes: p.apto_estudiantes,
        requisitos: textoOpcional(p.requisitos),
        duracionMinimaDias: p.duracion_minima_dias ?? undefined,
        disponibleDesde: p.disponible_desde,
        disponibleHasta: textoOpcional(p.disponible_hasta),
        estado: p.estado,
        fotos: fotos.map((foto) => foto.imagen),
        idsFotos: fotos.map((foto) => String(foto.id)),
        alquiladaEn: textoOpcional(p.alquilada_en),
        tipoDocumentoVerificacion: textoOpcional(p.tipo_documento_verificacion) as
            | TipoDocumentoVerificacionPublicacion
            | undefined,
        // RNF-06: es la ruta de la API que controla quién descarga el documento, no el archivo.
        // Se usa solo la ruta: el frontend y la API comparten dominio, y así el enlace
        // funciona igual detrás de Nginx o del proxy de desarrollo.
        urlArchivoVerificacion: p.archivo_verificacion ? new URL(p.archivo_verificacion, window.location.origin).pathname : undefined,
        nombreArchivoVerificacion: p.archivo_verificacion ? 'Documento de verificación' : undefined,
        motivoRechazoVerificacion: textoOpcional(p.motivo_rechazo_verificacion),
        notaModeracion: textoOpcional(p.nota_moderacion),
        motivoOcultamiento: textoOpcional(p.motivo_ocultamiento),
        eventosModeracion: p.eventos_moderacion?.map((evento) => adaptarEvento(evento, id)),
        acciones: p.acciones,
        creadaEn: p.creado_en,
        actualizadaEn: p.actualizado_en,
    }
}

function adaptarPagina(pagina: Pagina<PublicacionApi>): Pagina<Publicacion> {
    return { ...pagina, results: pagina.results.map(adaptarPublicacion) }
}

// ---- Listado público (RF-11) ----

// Traduce los filtros de la pantalla a los parámetros que entiende la API.
// Los valores "todas", "todos" o vacíos no se envían.
export function parametrosDeFiltros(filtros: Filtros): Record<string, string> {
    const parametros: Record<string, string> = {}
    if (filtros.modalidad !== 'todas') parametros.modalidad = filtros.modalidad
    if (filtros.tipoInmueble !== 'todos') parametros.tipo_inmueble = filtros.tipoInmueble
    if (filtros.ubicacion.trim()) parametros.ubicacion = filtros.ubicacion.trim()
    if (filtros.precioMin) parametros.precio_min = String(filtros.precioMin)
    if (filtros.precioMax) parametros.precio_max = String(filtros.precioMax)
    if (filtros.ambientesMin) parametros.ambientes_min = String(filtros.ambientesMin)
    if (filtros.dormitoriosMin) parametros.dormitorios_min = String(filtros.dormitoriosMin)
    if (filtros.amueblado) parametros.amueblado = 'true'
    if (filtros.serviciosIncluidos) parametros.servicios_incluidos = 'true'
    if (filtros.aceptaMascotas) parametros.acepta_mascotas = 'true'
    if (filtros.aptoEstudiantes) parametros.apto_estudiantes = 'true'
    // Las fechas y la estadía solo tienen sentido para alquileres temporarios.
    if (filtros.modalidad === 'temporario') {
        if (filtros.fechaDeseadaDesde) parametros.fecha_ingreso = filtros.fechaDeseadaDesde
        if (filtros.fechaDeseadaHasta) parametros.fecha_salida = filtros.fechaDeseadaHasta
        if (filtros.duracionEstadia) parametros.duracion_estadia = String(filtros.duracionEstadia)
    }
    return parametros
}

export async function listarPublicaciones(filtros: Filtros, pagina: number) {
    const { data } = await api.get<Pagina<PublicacionApi>>('/publicaciones/', {
        params: { ...parametrosDeFiltros(filtros), pagina },
    })
    return adaptarPagina(data)
}

export async function obtenerPublicacion(id: string) {
    const { data } = await api.get<PublicacionApi>(`/publicaciones/${id}/`)
    return adaptarPublicacion(data)
}

// ---- Panel del anunciante (RF-10) ----

export interface PaginaMisPublicaciones extends Pagina<Publicacion> {
    totales: Partial<Record<EstadoPublicacion, number>>
}

export async function listarMisPublicaciones(estado: EstadoPublicacion | null, pagina: number) {
    const { data } = await api.get<Pagina<PublicacionApi> & { totales: PaginaMisPublicaciones['totales'] }>(
        '/publicaciones/mias/',
        { params: { pagina, ...(estado ? { estado } : {}) } },
    )
    return { ...adaptarPagina(data), totales: data.totales } as PaginaMisPublicaciones
}

const ESTADO_POR_ACCION: Partial<Record<AccionPublicacion, EstadoPublicacion>> = {
    pausar: 'pausada',
    reactivar: 'activa',
    reservar: 'reservada',
    marcar_alquilada: 'alquilada',
}

export async function aplicarAccion(id: string, accion: AccionPublicacion) {
    const estado = ESTADO_POR_ACCION[accion]
    if (!estado) throw new Error(`La acción ${accion} no cambia el estado.`)
    const { data } = await api.post<PublicacionApi>(`/publicaciones/${id}/estado/`, { estado })
    return adaptarPublicacion(data)
}

export async function eliminarPublicacion(id: string) {
    await api.delete(`/publicaciones/${id}/`)
}

// ---- Alta y edición (RF-05, RF-06) ----

async function archivoDesdeDataUrl(dataUrl: string, indice: number): Promise<File> {
    const blob = await (await fetch(dataUrl)).blob()
    const extension = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
    return new File([blob], `foto-${indice + 1}.${extension}`, { type: blob.type })
}

// Arma el multipart que espera el backend. Las fotos nuevas llegan del formulario como
// data URL; las que ya estaban guardadas son URL de Cloudinary y se identifican por su id.
async function armarFormulario(datos: PublicacionFormData, incluirDocumento: boolean, original?: Publicacion) {
    const formulario = new FormData()
    formulario.append('tipo_inmueble', datos.tipoInmueble)
    formulario.append('modalidad', datos.modalidad)
    formulario.append('descripcion', datos.descripcion.trim())
    formulario.append('precio', String(datos.precio))
    formulario.append('expensas', datos.expensas ? String(datos.expensas) : '')
    formulario.append('ubicacion', datos.ubicacion.trim())
    formulario.append('lat', datos.lat === undefined ? '' : String(datos.lat))
    formulario.append('lng', datos.lng === undefined ? '' : String(datos.lng))
    formulario.append('ambientes', String(datos.ambientes))
    formulario.append('dormitorios', String(datos.dormitorios))
    formulario.append('amueblado', String(datos.amueblado))
    formulario.append('servicios_incluidos', String(datos.serviciosIncluidos))
    formulario.append('acepta_mascotas', String(datos.aceptaMascotas))
    formulario.append('apto_estudiantes', String(datos.aptoEstudiantes))
    formulario.append('requisitos', datos.requisitos?.trim() ?? '')
    formulario.append(
        'duracion_minima_dias',
        datos.modalidad === 'temporario' && datos.duracionMinimaDias ? String(datos.duracionMinimaDias) : '',
    )
    formulario.append('disponible_desde', datos.disponibleDesde)
    formulario.append('disponible_hasta', datos.disponibleHasta ?? '')

    if (incluirDocumento && datos.tipoDocumentoVerificacion) {
        formulario.append('tipo_documento_verificacion', datos.tipoDocumentoVerificacion)
    }
    if (datos.archivoVerificacion) {
        formulario.append('archivo_verificacion', datos.archivoVerificacion)
    }

    const nuevas = datos.fotos.filter((foto) => foto.startsWith('data:'))
    const archivos = await Promise.all(nuevas.map(archivoDesdeDataUrl))
    archivos.forEach((archivo) => formulario.append('fotos', archivo))

    if (original) {
        original.fotos.forEach((url, indice) => {
            const idFoto = original.idsFotos?.[indice]
            if (idFoto && !datos.fotos.includes(url)) formulario.append('fotos_a_eliminar', idFoto)
        })
    }
    return formulario
}

export async function crearPublicacion(datos: PublicacionFormData) {
    const formulario = await armarFormulario(datos, true)
    const { data } = await api.post<PublicacionApi>('/publicaciones/', formulario)
    return adaptarPublicacion(data)
}

export async function actualizarPublicacion(original: Publicacion, datos: PublicacionFormData, incluirDocumento: boolean) {
    const formulario = await armarFormulario(datos, incluirDocumento, original)
    const { data } = await api.patch<PublicacionApi>(`/publicaciones/${original.id}/`, formulario)
    return adaptarPublicacion(data)
}
