import { api } from './api'
import type { TipoInmueble } from '../types/publicacion'

interface ConteoApi {
    etiqueta: string
    cantidad: number
}

interface DemandaApi {
    busquedas_activas: number
    usuarios_buscando: number
    tipo_mas_buscado: string | null
    rango_mas_solicitado: string | null
    por_tipo: ConteoApi[]
    por_rango_precio: ConteoApi[]
    por_zona: ConteoApi[]
    caracteristicas: ConteoApi[]
    tendencia_semanal: ConteoApi[]
    coincidencias_por_publicacion: { publicacion: { id: number; descripcion: string }; usuarios: number }[]
    zonas_disponibles: string[]
}

export interface Barra {
    etiqueta: string
    valor: number
    href?: string
}

export interface Demanda {
    busquedasActivas: number
    usuariosBuscando: number
    tipoMasBuscado?: string
    rangoMasSolicitado?: string
    porTipo: Barra[]
    porRangoPrecio: Barra[]
    porZona: Barra[]
    caracteristicas: Barra[]
    tendenciaSemanal: Barra[]
    coincidenciasPorPublicacion: Barra[]
    zonasDisponibles: string[]
}

const ETIQUETAS_CARACTERISTICAS: Record<string, string> = {
    amueblado: 'Amueblado',
    servicios_incluidos: 'Servicios incluidos',
    acepta_mascotas: 'Acepta mascotas',
    apto_estudiantes: 'Apto estudiantes',
}

function barras(conteos: ConteoApi[], etiquetas: Record<string, string> = {}): Barra[] {
    return conteos.map(({ etiqueta, cantidad }) => ({ etiqueta: etiquetas[etiqueta] ?? etiqueta, valor: cantidad }))
}

export interface FiltrosDemanda {
    desde?: string
    hasta?: string
    zona?: string
    tipoInmueble?: TipoInmueble
}

// RNF-07: la API solo devuelve conteos agregados, nunca datos de quienes buscan.
export async function obtenerDemanda(filtros: FiltrosDemanda): Promise<Demanda> {
    const params: Record<string, string> = {}
    if (filtros.desde) params.desde = filtros.desde
    if (filtros.hasta) params.hasta = filtros.hasta
    if (filtros.zona) params.zona = filtros.zona
    if (filtros.tipoInmueble) params.tipo_inmueble = filtros.tipoInmueble

    const { data } = await api.get<DemandaApi>('/demanda/', { params })
    return {
        busquedasActivas: data.busquedas_activas,
        usuariosBuscando: data.usuarios_buscando,
        tipoMasBuscado: data.tipo_mas_buscado ?? undefined,
        rangoMasSolicitado: data.rango_mas_solicitado ?? undefined,
        porTipo: barras(data.por_tipo),
        porRangoPrecio: barras(data.por_rango_precio),
        porZona: barras(data.por_zona),
        caracteristicas: barras(data.caracteristicas, ETIQUETAS_CARACTERISTICAS),
        tendenciaSemanal: barras(data.tendencia_semanal),
        coincidenciasPorPublicacion: data.coincidencias_por_publicacion.map(({ publicacion, usuarios }) => ({
            etiqueta: publicacion.descripcion,
            valor: usuarios,
            href: `/explorar/${publicacion.id}`,
        })),
        zonasDisponibles: data.zonas_disponibles,
    }
}
