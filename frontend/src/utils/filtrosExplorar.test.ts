import { FILTROS_INICIALES, filtrosDesdeQuery } from './filtrosExplorar'
import { parametrosDeFiltros } from '../servicios/publicaciones'

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
            duracionEstadia: '10',
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
            duracionEstadia: 10,
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

describe('parametrosDeFiltros', () => {
    test('sin filtros activos no envía ningún parámetro', () => {
        expect(parametrosDeFiltros(FILTROS_INICIALES)).toEqual({})
    })

    test('traduce los filtros a los nombres que espera la API', () => {
        expect(
            parametrosDeFiltros({
                ...FILTROS_INICIALES,
                ubicacion: '  Centro ',
                modalidad: 'residencial',
                tipoInmueble: 'casa',
                precioMin: 100000,
                precioMax: 200000,
                ambientesMin: 2,
                dormitoriosMin: 1,
                amueblado: true,
                serviciosIncluidos: true,
                aceptaMascotas: true,
                aptoEstudiantes: true,
            }),
        ).toEqual({
            ubicacion: 'Centro',
            modalidad: 'residencial',
            tipo_inmueble: 'casa',
            precio_min: '100000',
            precio_max: '200000',
            ambientes_min: '2',
            dormitorios_min: '1',
            amueblado: 'true',
            servicios_incluidos: 'true',
            acepta_mascotas: 'true',
            apto_estudiantes: 'true',
        })
    })

    test('envía fechas y duración de la estadía solo para alquileres temporarios', () => {
        const conEstadia = {
            ...FILTROS_INICIALES,
            fechaDeseadaDesde: '2026-12-01',
            fechaDeseadaHasta: '2026-12-15',
            duracionEstadia: 7,
        }
        expect(parametrosDeFiltros({ ...conEstadia, modalidad: 'temporario' })).toEqual({
            modalidad: 'temporario',
            fecha_ingreso: '2026-12-01',
            fecha_salida: '2026-12-15',
            duracion_estadia: '7',
        })
        expect(parametrosDeFiltros({ ...conEstadia, modalidad: 'residencial' })).toEqual({ modalidad: 'residencial' })
    })
})
