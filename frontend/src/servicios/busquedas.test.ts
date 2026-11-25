import { cuerpoDeBusqueda } from './busquedas'
import type { BusquedaFormData } from '../types/busqueda'

const SIN_CRITERIOS: BusquedaFormData = {
    nombre: '',
    modalidad: 'todas',
    tipoInmueble: 'todos',
    precioMin: 0,
    precioMax: 0,
    ambientesMin: 0,
    dormitoriosMin: 0,
    ubicacion: '',
    amueblado: false,
    serviciosIncluidos: false,
    aceptaMascotas: false,
    aptoEstudiantes: false,
    fechaDeseadaDesde: '',
    fechaDeseadaHasta: '',
    duracionEstadia: 0,
}

describe('cuerpoDeBusqueda', () => {
    test('"sin preferencia" se envía como null, como lo guarda el backend', () => {
        expect(Object.values(cuerpoDeBusqueda(SIN_CRITERIOS)).every((valor) => valor === null)).toBe(true)
    })

    test('traduce los criterios elegidos a los nombres de la API', () => {
        expect(
            cuerpoDeBusqueda({
                ...SIN_CRITERIOS,
                nombre: '  Depto centro ',
                modalidad: 'residencial',
                tipoInmueble: 'departamento',
                precioMax: 250000,
                ambientesMin: 2,
                ubicacion: ' Centro ',
                aceptaMascotas: true,
            }),
        ).toEqual(
            expect.objectContaining({
                nombre: 'Depto centro',
                modalidad: 'residencial',
                tipo_inmueble: 'departamento',
                precio_minimo: null,
                precio_maximo: 250000,
                ambientes_minimos: 2,
                ubicacion: 'Centro',
                acepta_mascotas: true,
                amueblado: null,
            }),
        )
    })

    test('las fechas y la estadía solo se envían en búsquedas temporarias', () => {
        const conEstadia = {
            ...SIN_CRITERIOS,
            fechaDeseadaDesde: '2026-12-01',
            fechaDeseadaHasta: '2026-12-10',
            duracionEstadia: 9,
        }
        expect(cuerpoDeBusqueda({ ...conEstadia, modalidad: 'temporario' })).toEqual(
            expect.objectContaining({ fecha_ingreso: '2026-12-01', fecha_salida: '2026-12-10', duracion_estadia_dias: 9 }),
        )
        expect(cuerpoDeBusqueda({ ...conEstadia, modalidad: 'residencial' })).toEqual(
            expect.objectContaining({ fecha_ingreso: null, fecha_salida: null, duracion_estadia_dias: null }),
        )
    })
})
