import type { EstadoPublicacion, Publicacion, PublicacionFormData } from '../types/publicacion'

function generarId(): string {
    return `pub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function fotoPlaceholder(etiqueta: string, color: string): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="${color}"/><text x="50%" y="50%" font-family="sans-serif" font-size="28" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${etiqueta}</text></svg>`
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function fotosPlaceholder(colorBase: string): string[] {
    return [
        fotoPlaceholder('Foto 1', colorBase),
        fotoPlaceholder('Foto 2', colorBase),
        fotoPlaceholder('Foto 3', colorBase),
    ]
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
        ambientes: 2,
        dormitorios: 1,
        disponibleDesde: '2026-10-01',
        fotos: fotosPlaceholder('#3E6249'),
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
        ambientes: 4,
        dormitorios: 3,
        disponibleDesde: '2026-09-20',
        fotos: fotosPlaceholder('#8A5A14'),
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
        ambientes: 1,
        dormitorios: 1,
        disponibleDesde: '2026-09-15',
        disponibleHasta: '2026-12-15',
        duracionMinima: '7 noches',
        fotos: fotosPlaceholder('#8B5E4A'),
        serviciosIncluidos: true,
        amueblado: true,
        aceptaMascotas: false,
        aptoEstudiantes: false,
        estado: 'activa',
        creadaEn: '2026-09-02T15:00:00.000Z',
        actualizadaEn: '2026-09-02T15:00:00.000Z',
    },
]

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

function moderarAutomaticamente(
    datos: PublicacionFormData,
    propietarioId: string,
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

    return 'activa'
}

export function crearPublicacion(datos: PublicacionFormData, propietarioId: string): Publicacion {
    const lista = leerAlmacenamiento()
    const ahora = new Date().toISOString()
    const nueva: Publicacion = {
        ...datos,
        id: generarId(),
        propietarioId,
        estado: moderarAutomaticamente(datos, propietarioId),
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

    const actualizada: Publicacion = {
        ...lista[indice],
        ...datos,
        estado: moderarAutomaticamente(datos, propietarioId, id),
        actualizadaEn: new Date().toISOString(),
    }
    lista[indice] = actualizada
    guardarAlmacenamiento(lista)
    return actualizada
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
}

export function eliminarPublicacion(id: string, propietarioId: string): void {
    cambiarEstadoPublicacion(id, propietarioId, 'eliminada')
}
