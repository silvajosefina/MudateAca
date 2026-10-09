import type { EstadoPublicacion, Publicacion, PublicacionFormData } from '../types/publicacion'
import { esFavorito } from './favoritos'
import { crearNotificacion } from './notificaciones'
import { obtenerSesion } from './sesion'
import { mostrarToast } from './toast'

const ETIQUETAS_ESTADO_NOTIFICACION: Partial<Record<EstadoPublicacion, string>> = {
    alquilada: 'fue marcada como alquilada',
    pausada: 'fue pausada',
    activa: 'está nuevamente disponible',
    archivada: 'ya no está disponible',
    reservada: 'fue reservada por otro interesado',
}

function generarId(): string {
    return `pub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function urlFotoUnsplash(id: string): string {
    return `https://images.unsplash.com/photo-${id}?w=800&h=600&q=80&auto=format&fit=crop`
}

const PUBLICACIONES_INICIALES: Publicacion[] = [
    {
        id: 'pub_seed_1',
        propietarioId: 'u2',
        tipoInmueble: 'departamento',
        modalidad: 'residencial',
        descripcion: 'Departamento luminoso de 2 ambientes, a 3 cuadras de la plaza principal.',
        precio: 180000,
        ubicacion: 'Centro, Trenque Lauquen',
        lat: -35.9666,
        lng: -62.7333,
        ambientes: 2,
        dormitorios: 1,
        disponibleDesde: '2026-10-01',
        fotos: [
            urlFotoUnsplash('1738168279272-c08d6dd22002'),
            urlFotoUnsplash('1666282167632-c613fbeb163c'),
            urlFotoUnsplash('1682184805271-11671b7ecf4c'),
        ],
        serviciosIncluidos: false,
        amueblado: false,
        aceptaMascotas: true,
        aptoEstudiantes: true,
        estado: 'activa',
        creadaEn: '2026-09-05T10:00:00.000Z',
        actualizadaEn: '2026-09-05T10:00:00.000Z',
    },
    {
        id: 'pub_seed_2',
        propietarioId: 'u2',
        tipoInmueble: 'casa',
        modalidad: 'residencial',
        descripcion: 'Casa con patio, apta para mascotas, en barrio residencial tranquilo.',
        precio: 260000,
        expensas: 0,
        ubicacion: 'Barrio Norte, Trenque Lauquen',
        lat: -35.959,
        lng: -62.731,
        ambientes: 4,
        dormitorios: 3,
        disponibleDesde: '2026-09-20',
        fotos: [
            urlFotoUnsplash('1628624747186-a941c476b7ef'),
            urlFotoUnsplash('1605276374104-dee2a0ed3cd6'),
            urlFotoUnsplash('1721815693498-cc28507c0ba2'),
        ],
        serviciosIncluidos: false,
        amueblado: false,
        aceptaMascotas: true,
        aptoEstudiantes: false,
        estado: 'pausada',
        creadaEn: '2026-08-20T09:30:00.000Z',
        actualizadaEn: '2026-09-01T12:00:00.000Z',
    },
    {
        id: 'pub_seed_3',
        propietarioId: 'u2',
        tipoInmueble: 'departamento',
        modalidad: 'temporario',
        descripcion: 'Departamento de 1 ambiente equipado, ideal para estadías cortas.',
        precio: 35000,
        ubicacion: 'Zona Terminal, Trenque Lauquen',
        lat: -35.97,
        lng: -62.728,
        ambientes: 1,
        dormitorios: 1,
        disponibleDesde: '2026-09-15',
        disponibleHasta: '2026-12-15',
        duracionMinima: '7 noches',
        fotos: [
            urlFotoUnsplash('1552558636-f6a8f071c2b3'),
            urlFotoUnsplash('1612152605347-f93296cb657d'),
            urlFotoUnsplash('1484154218962-a197022b5858'),
        ],
        serviciosIncluidos: true,
        amueblado: true,
        aceptaMascotas: false,
        aptoEstudiantes: false,
        estado: 'activa',
        creadaEn: '2026-09-02T15:00:00.000Z',
        actualizadaEn: '2026-09-02T15:00:00.000Z',
    },
    {
        id: 'pub_seed_4',
        propietarioId: 'u2',
        tipoInmueble: 'habitacion',
        modalidad: 'residencial',
        descripcion: 'Habitación en casa compartida, ambiente tranquilo.',
        precio: 90000,
        ubicacion: 'Zona Norte, Trenque Lauquen',
        lat: -35.955,
        lng: -62.735,
        ambientes: 1,
        dormitorios: 1,
        disponibleDesde: '2026-09-10',
        fotos: [
            urlFotoUnsplash('1502672260266-1c1ef2d93688'),
            urlFotoUnsplash('1595526114035-0d45ed16cfbf'),
            urlFotoUnsplash('1522708323590-d24dbb6b0267'),
        ],
        serviciosIncluidos: true,
        amueblado: true,
        aceptaMascotas: false,
        aptoEstudiantes: true,
        estado: 'observada',
        creadaEn: '2026-09-08T11:00:00.000Z',
        actualizadaEn: '2026-09-08T11:00:00.000Z',
    },
    {
        id: 'pub_seed_5',
        propietarioId: 'u2',
        tipoInmueble: 'departamento',
        modalidad: 'residencial',
        descripcion: 'Departamento de 3 ambientes, alquilado y ya fuera de disponibilidad.',
        precio: 210000,
        ubicacion: 'Centro, Trenque Lauquen',
        lat: -35.968,
        lng: -62.73,
        ambientes: 3,
        dormitorios: 2,
        disponibleDesde: '2026-07-01',
        fotos: [
            urlFotoUnsplash('1502672023488-70e25813eb80'),
            urlFotoUnsplash('1560448204-e02f11c3d0e2'),
            urlFotoUnsplash('1560449017-7e3d3c1cd9e6'),
        ],
        serviciosIncluidos: false,
        amueblado: false,
        aceptaMascotas: false,
        aptoEstudiantes: false,
        estado: 'archivada',
        creadaEn: '2026-07-01T09:00:00.000Z',
        actualizadaEn: '2026-08-05T09:00:00.000Z',
    },
    {
        id: 'pub_seed_6',
        propietarioId: 'u2',
        tipoInmueble: 'departamento',
        modalidad: 'residencial',
        descripcion: 'Departamento de 2 ambientes con balcón, muy luminoso y a estrenar.',
        precio: 195000,
        ubicacion: 'Barrio Belgrano, Trenque Lauquen',
        lat: -35.962,
        lng: -62.726,
        ambientes: 2,
        dormitorios: 1,
        disponibleDesde: '2026-09-12',
        fotos: [
            urlFotoUnsplash('1502672260266-1c1ef2d93688'),
            urlFotoUnsplash('1484154218962-a197022b5858'),
            urlFotoUnsplash('1595526114035-0d45ed16cfbf'),
        ],
        serviciosIncluidos: false,
        amueblado: false,
        aceptaMascotas: false,
        aptoEstudiantes: true,
        estado: 'activa',
        creadaEn: '2026-09-10T10:00:00.000Z',
        actualizadaEn: '2026-09-10T10:00:00.000Z',
    },
    {
        id: 'pub_seed_7',
        propietarioId: 'u2',
        tipoInmueble: 'departamento',
        modalidad: 'residencial',
        descripcion: 'Departamento de 3 ambientes con cochera, ideal para familia.',
        precio: 230000,
        ubicacion: 'Centro, Trenque Lauquen',
        lat: -35.9645,
        lng: -62.7318,
        ambientes: 3,
        dormitorios: 2,
        disponibleDesde: '2026-09-18',
        fotos: [
            urlFotoUnsplash('1560448204-e02f11c3d0e2'),
            urlFotoUnsplash('1612152605347-f93296cb657d'),
            urlFotoUnsplash('1682184805271-11671b7ecf4c'),
        ],
        serviciosIncluidos: true,
        amueblado: false,
        aceptaMascotas: true,
        aptoEstudiantes: false,
        estado: 'activa',
        creadaEn: '2026-09-14T14:00:00.000Z',
        actualizadaEn: '2026-09-14T14:00:00.000Z',
    },
    {
        id: 'pub_seed_8',
        propietarioId: 'u2',
        tipoInmueble: 'departamento',
        modalidad: 'residencial',
        descripcion: 'Monoambiente amplio, ideal para estudiantes, cerca de la terminal.',
        precio: 110000,
        ubicacion: 'Zona Terminal, Trenque Lauquen',
        lat: -35.9705,
        lng: -62.7275,
        ambientes: 1,
        dormitorios: 0,
        disponibleDesde: '2026-09-22',
        fotos: [
            urlFotoUnsplash('1666282167632-c613fbeb163c'),
            urlFotoUnsplash('1738168279272-c08d6dd22002'),
            urlFotoUnsplash('1552558636-f6a8f071c2b3'),
        ],
        serviciosIncluidos: true,
        amueblado: true,
        aceptaMascotas: false,
        aptoEstudiantes: true,
        estado: 'activa',
        creadaEn: '2026-09-16T09:00:00.000Z',
        actualizadaEn: '2026-09-16T09:00:00.000Z',
    },
]

// Las publicaciones viven solo en memoria: cada recarga/reinicio del
// servidor de desarrollo vuelve a partir únicamente de la data semilla.
// Lo creado a mano durante la sesión (vía el formulario) no persiste.
let publicacionesEnMemoria: Publicacion[] = PUBLICACIONES_INICIALES

function leerAlmacenamiento(): Publicacion[] {
    return publicacionesEnMemoria
}

function guardarAlmacenamiento(lista: Publicacion[]) {
    publicacionesEnMemoria = lista
}

export function obtenerPublicacionesDeUsuario(propietarioId: string): Publicacion[] {
    return leerAlmacenamiento()
        .filter((p) => p.propietarioId === propietarioId)
        .sort((a, b) => b.actualizadaEn.localeCompare(a.actualizadaEn))
}

export function obtenerPublicacionPorId(id: string): Publicacion | undefined {
    return leerAlmacenamiento().find((p) => p.id === id)
}

export function obtenerPublicacionesActivas(): Publicacion[] {
    return leerAlmacenamiento()
        .filter((p) => p.estado === 'activa')
        .sort((a, b) => b.actualizadaEn.localeCompare(a.actualizadaEn))
}

function moderarAutomaticamente(
    datos: PublicacionFormData,
    propietarioId: string,
    forzarRevision: boolean,
    idAIgnorar?: string,
): EstadoPublicacion {
    const camposCompletos =
        Boolean(datos.tipoInmueble) &&
        Boolean(datos.modalidad) &&
        datos.descripcion.trim().length > 0 &&
        datos.precio > 0 &&
        datos.ubicacion.trim().length > 0 &&
        datos.ambientes > 0 &&
        datos.dormitorios >= 0 &&
        Boolean(datos.disponibleDesde) &&
        datos.fotos.length >= 3

    if (!camposCompletos) return 'observada'

    const duplicada = leerAlmacenamiento().some(
        (p) =>
            p.id !== idAIgnorar &&
            p.propietarioId === propietarioId &&
            p.estado !== 'eliminada' &&
            p.descripcion.trim().toLowerCase() === datos.descripcion.trim().toLowerCase() &&
            p.ubicacion.trim().toLowerCase() === datos.ubicacion.trim().toLowerCase(),
    )
    if (duplicada) return 'observada'

    return forzarRevision ? 'pendiente_moderacion' : 'activa'
}

export function crearPublicacion(datos: PublicacionFormData, propietarioId: string): Publicacion {
    const lista = leerAlmacenamiento()
    const ahora = new Date().toISOString()
    // Toda publicación nueva pasa por revisión administrativa antes de quedar activa (RF-06).
    const nueva: Publicacion = {
        ...datos,
        id: generarId(),
        propietarioId,
        estado: moderarAutomaticamente(datos, propietarioId, true),
        creadaEn: ahora,
        actualizadaEn: ahora,
    }
    guardarAlmacenamiento([nueva, ...lista])
    return nueva
}

export function actualizarPublicacion(
    id: string,
    datos: PublicacionFormData,
    propietarioId: string,
): Publicacion | undefined {
    const lista = leerAlmacenamiento()
    const indice = lista.findIndex((p) => p.id === id && p.propietarioId === propietarioId)
    if (indice === -1) return undefined

    const anterior = lista[indice]
    const forzarRevision = anterior.estado === 'pendiente_moderacion' || anterior.estado === 'rechazada'

    const actualizada: Publicacion = {
        ...anterior,
        ...datos,
        estado: moderarAutomaticamente(datos, propietarioId, forzarRevision, id),
        motivoRechazoVerificacion: forzarRevision ? undefined : anterior.motivoRechazoVerificacion,
        actualizadaEn: new Date().toISOString(),
    }
    lista[indice] = actualizada
    guardarAlmacenamiento(lista)
    return actualizada
}

export function obtenerPublicacionesEnRevision(): Publicacion[] {
    return leerAlmacenamiento()
        .filter((p) => p.estado === 'pendiente_moderacion' || p.estado === 'observada')
        .sort((a, b) => a.creadaEn.localeCompare(b.creadaEn))
}

export function obtenerTodasLasPublicaciones(): Publicacion[] {
    return leerAlmacenamiento()
        .slice()
        .sort((a, b) => b.actualizadaEn.localeCompare(a.actualizadaEn))
}

export function aprobarVerificacionPublicacion(id: string): void {
    const lista = leerAlmacenamiento()
    const indice = lista.findIndex((p) => p.id === id)
    if (indice === -1) return
    lista[indice] = {
        ...lista[indice],
        estado: 'activa',
        motivoRechazoVerificacion: undefined,
        notaModeracion: undefined,
        actualizadaEn: new Date().toISOString(),
    }
    guardarAlmacenamiento(lista)
    crearNotificacion(lista[indice].propietarioId, 'Tu publicación fue verificada y ya está activa.', 'exito', '/mis-publicaciones')
}

export function rechazarVerificacionPublicacion(id: string, motivo: string): void {
    const lista = leerAlmacenamiento()
    const indice = lista.findIndex((p) => p.id === id)
    if (indice === -1) return
    lista[indice] = {
        ...lista[indice],
        estado: 'rechazada',
        motivoRechazoVerificacion: motivo,
        actualizadaEn: new Date().toISOString(),
    }
    guardarAlmacenamiento(lista)
    crearNotificacion(lista[indice].propietarioId, `Tu publicación fue rechazada. Motivo: ${motivo}`, 'error', '/mis-publicaciones')
}

export function solicitarModificacionesPublicacion(id: string, nota: string): void {
    const lista = leerAlmacenamiento()
    const indice = lista.findIndex((p) => p.id === id)
    if (indice === -1) return
    lista[indice] = {
        ...lista[indice],
        estado: 'observada',
        notaModeracion: nota,
        actualizadaEn: new Date().toISOString(),
    }
    guardarAlmacenamiento(lista)
    crearNotificacion(
        lista[indice].propietarioId,
        `Un administrador solicitó modificaciones en tu publicación. Nota: ${nota}`,
        'error',
        `/publicaciones/${id}/editar`,
    )
}

export function ocultarPublicacion(id: string, motivo: string): void {
    const lista = leerAlmacenamiento()
    const indice = lista.findIndex((p) => p.id === id)
    if (indice === -1) return
    lista[indice] = {
        ...lista[indice],
        estado: 'archivada',
        notaModeracion: motivo,
        actualizadaEn: new Date().toISOString(),
    }
    guardarAlmacenamiento(lista)
    crearNotificacion(
        lista[indice].propietarioId,
        `Un administrador ocultó tu publicación. Motivo: ${motivo}`,
        'error',
        '/mis-publicaciones',
    )
}

export function cambiarEstadoPublicacion(
    id: string,
    propietarioId: string,
    nuevoEstado: EstadoPublicacion,
): void {
    const lista = leerAlmacenamiento()
    const indice = lista.findIndex((p) => p.id === id && p.propietarioId === propietarioId)
    if (indice === -1) return
    lista[indice] = { ...lista[indice], estado: nuevoEstado, actualizadaEn: new Date().toISOString() }
    guardarAlmacenamiento(lista)

    const sesion = obtenerSesion()
    const mensaje = ETIQUETAS_ESTADO_NOTIFICACION[nuevoEstado]
    if (sesion && mensaje && esFavorito(sesion.id, id)) {
        mostrarToast(`Una publicación que tenés en favoritos ${mensaje}.`)
    }
}

export function eliminarPublicacion(id: string, propietarioId: string): void {
    cambiarEstadoPublicacion(id, propietarioId, 'eliminada')
}
