import { coincideConFiltros, FILTROS_INICIALES, filtrosDesdeQuery } from './filtrosExplorar'
import type { Publicacion } from '../types/publicacion'

function crearPublicacion(overrides: Partial<Publicacion> = {}): Publicacion {
    return {
        id: 'pub1',
        propietarioId: 'u2',
        tipoInmueble: 'departamento',
        modalidad: 'residencial',
        descripcion: 'Departamento de prueba',
        precio: 150000,
        ubicacion: 'Centro, Trenque Lauquen',
        ambientes: 2,
        dormitorios: 1,
        disponibleDesde: '2026-06-01',
        fotos: [],
        serviciosIncluidos: false,
        amueblado: false,
        aceptaMascotas: false,
        aptoEstudiantes: false,
        estado: 'activa',
        creadaEn: '2026-01-01T00:00:00.000Z',
        actualizadaEn: '2026-01-01T00:00:00.000Z',
        ...overrides,
    }
}

describe('filtrosDesdeQuery', () => {
    test('con query string vacía devuelve valores por defecto', () => {
        expect(filtrosDesdeQuery(new URLSearchParams())).toEqual(FILTROS_INICIALES)
    })

    test('parsea valores válidos de todos los campos', () => {
        const params = new URLSearchParams({
            ubicacion: 'Centro',
            modalidad: 'temporario',
            tipoInmueble: 'casa',
            precioMin: '100000',
            precioMax: '200000',
            ambientesMin: '2',
            dormitoriosMin: '1',
            amueblado: '1',
            serviciosIncluidos: '1',
            aceptaMascotas: '1',
            aptoEstudiantes: '1',
            fechaDeseadaDesde: '2026-01-01',
            fechaDeseadaHasta: '2026-02-01',
        })
        expect(filtrosDesdeQuery(params)).toEqual({
            ubicacion: 'Centro',
            modalidad: 'temporario',
            tipoInmueble: 'casa',
            precioMin: 100000,
            precioMax: 200000,
            ambientesMin: 2,
            dormitoriosMin: 1,
            amueblado: true,
            serviciosIncluidos: true,
            aceptaMascotas: true,
            aptoEstudiantes: true,
            fechaDeseadaDesde: '2026-01-01',
            fechaDeseadaHasta: '2026-02-01',
        })
    })

    test('descarta valores de modalidad/tipoInmueble que no son válidos', () => {
        const params = new URLSearchParams({ modalidad: 'inventado', tipoInmueble: 'inventado' })
        const resultado = filtrosDesdeQuery(params)
        expect(resultado.modalidad).toBe('todas')
        expect(resultado.tipoInmueble).toBe('todos')
    })

    test('valores numéricos no numéricos caen en 0', () => {
        const params = new URLSearchParams({ precioMin: 'abc', ambientesMin: '' })
        const resultado = filtrosDesdeQuery(params)
        expect(resultado.precioMin).toBe(0)
        expect(resultado.ambientesMin).toBe(0)
    })

    test('checkboxes solo se activan con el valor exacto "1"', () => {
        const params = new URLSearchParams({ amueblado: 'true', serviciosIncluidos: '0' })
        const resultado = filtrosDesdeQuery(params)
        expect(resultado.amueblado).toBe(false)
        expect(resultado.serviciosIncluidos).toBe(false)
    })
})

describe('coincideConFiltros - camino feliz', () => {
    test('sin filtros activos, cualquier publicación coincide', () => {
        expect(coincideConFiltros(crearPublicacion(), FILTROS_INICIALES)).toBe(true)
    })

    test('filtra por ubicación de forma parcial e insensible a mayúsculas', () => {
        const publicacion = crearPublicacion({ ubicacion: 'Barrio Norte, Trenque Lauquen' })
        expect(coincideConFiltros(publicacion, { ...FILTROS_INICIALES, ubicacion: 'barrio norte' })).toBe(true)
        expect(coincideConFiltros(publicacion, { ...FILTROS_INICIALES, ubicacion: 'Centro' })).toBe(false)
    })

    test('filtra por tipo de inmueble y modalidad', () => {
        const publicacion = crearPublicacion({ tipoInmueble: 'casa', modalidad: 'temporario' })
        expect(coincideConFiltros(publicacion, { ...FILTROS_INICIALES, tipoInmueble: 'casa' })).toBe(true)
        expect(coincideConFiltros(publicacion, { ...FILTROS_INICIALES, tipoInmueble: 'departamento' })).toBe(false)
        expect(coincideConFiltros(publicacion, { ...FILTROS_INICIALES, modalidad: 'temporario' })).toBe(true)
        expect(coincideConFiltros(publicacion, { ...FILTROS_INICIALES, modalidad: 'residencial' })).toBe(false)
    })
})

describe('coincideConFiltros - escenarios negativos y casos borde', () => {
    test('precioMin negativo no descarta ninguna publicación (precio real siempre > negativo)', () => {
        const publicacion = crearPublicacion({ precio: 100 })
        expect(coincideConFiltros(publicacion, { ...FILTROS_INICIALES, precioMin: -500 })).toBe(true)
    })

    test('precioMax negativo descarta todas las publicaciones (precio real siempre > negativo)', () => {
        const publicacion = crearPublicacion({ precio: 100 })
        expect(coincideConFiltros(publicacion, { ...FILTROS_INICIALES, precioMax: -500 })).toBe(false)
    })

    test('rango de precio invertido (mínimo mayor que máximo) no deja pasar ninguna publicación', () => {
        const publicacion = crearPublicacion({ precio: 150000 })
        expect(
            coincideConFiltros(publicacion, { ...FILTROS_INICIALES, precioMin: 300000, precioMax: 100000 }),
        ).toBe(false)
    })

    test('ambientesMin/dormitoriosMin negativos no descartan ninguna publicación', () => {
        const publicacion = crearPublicacion({ ambientes: 1, dormitorios: 0 })
        expect(
            coincideConFiltros(publicacion, { ...FILTROS_INICIALES, ambientesMin: -2, dormitoriosMin: -1 }),
        ).toBe(true)
    })

    test('ubicación vacía o solo espacios no aplica ningún filtro', () => {
        const publicacion = crearPublicacion({ ubicacion: 'Cualquier lugar' })
        expect(coincideConFiltros(publicacion, { ...FILTROS_INICIALES, ubicacion: '' })).toBe(true)
        expect(coincideConFiltros(publicacion, { ...FILTROS_INICIALES, ubicacion: '   ' })).toBe(true)
    })

    test('ubicación con caracteres que no aparecen en ningún lado no deja coincidencias', () => {
        const publicacion = crearPublicacion({ ubicacion: 'Centro, Trenque Lauquen' })
        expect(coincideConFiltros(publicacion, { ...FILTROS_INICIALES, ubicacion: 'xyz-inexistente' })).toBe(false)
    })

    test('los filtros de fecha deseada solo aplican a publicaciones temporarias', () => {
        const residencial = crearPublicacion({ modalidad: 'residencial', disponibleDesde: '2026-06-01' })
        expect(
            coincideConFiltros(residencial, {
                ...FILTROS_INICIALES,
                fechaDeseadaDesde: '2030-01-01',
                fechaDeseadaHasta: '2030-01-02',
            }),
        ).toBe(true)
    })

    test('descarta una publicación temporaria si termina antes de la fecha deseada desde', () => {
        const temporaria = crearPublicacion({
            modalidad: 'temporario',
            disponibleDesde: '2026-01-01',
            disponibleHasta: '2026-01-10',
        })
        expect(
            coincideConFiltros(temporaria, { ...FILTROS_INICIALES, fechaDeseadaDesde: '2026-02-01' }),
        ).toBe(false)
    })

    test('descarta una publicación temporaria si empieza después de la fecha deseada hasta', () => {
        const temporaria = crearPublicacion({
            modalidad: 'temporario',
            disponibleDesde: '2026-03-01',
        })
        expect(
            coincideConFiltros(temporaria, { ...FILTROS_INICIALES, fechaDeseadaHasta: '2026-02-01' }),
        ).toBe(false)
    })

    test('checkboxes exigentes descartan publicaciones que no cumplen la característica', () => {
        const publicacion = crearPublicacion({
            amueblado: false,
            serviciosIncluidos: false,
            aceptaMascotas: false,
            aptoEstudiantes: false,
        })
        expect(coincideConFiltros(publicacion, { ...FILTROS_INICIALES, amueblado: true })).toBe(false)
        expect(coincideConFiltros(publicacion, { ...FILTROS_INICIALES, serviciosIncluidos: true })).toBe(false)
        expect(coincideConFiltros(publicacion, { ...FILTROS_INICIALES, aceptaMascotas: true })).toBe(false)
        expect(coincideConFiltros(publicacion, { ...FILTROS_INICIALES, aptoEstudiantes: true })).toBe(false)
    })
})
