import { calcularCompatibilidad } from './busquedasActivas'
import type { BusquedaActiva } from '../types/busqueda'
import type { Publicacion } from '../types/publicacion'

jest.mock('./publicaciones', () => ({ obtenerPublicacionesActivas: () => [] }))

const busquedaBase: BusquedaActiva = {
    id: 'bus_1',
    usuarioId: 'u1',
    nombre: 'Prueba',
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
    estado: 'activa',
    creadaEn: '2026-10-01T10:00:00.000Z',
    actualizadaEn: '2026-10-01T10:00:00.000Z',
}

const publicacionBase: Publicacion = {
    id: 'pub_1',
    propietarioId: 'u2',
    tipoInmueble: 'departamento',
    modalidad: 'residencial',
    descripcion: 'Monoambiente amplio.',
    precio: 110000,
    ubicacion: 'Zona Terminal, Trenque Lauquen',
    ambientes: 1,
    dormitorios: 0,
    disponibleDesde: '2026-11-01',
    fotos: [],
    serviciosIncluidos: false,
    amueblado: false,
    aceptaMascotas: false,
    aptoEstudiantes: false,
    estado: 'activa',
    creadaEn: '2026-10-01T10:00:00.000Z',
    actualizadaEn: '2026-10-01T10:00:00.000Z',
}

describe('calcularCompatibilidad', () => {
    it('no considera compatible un precio fuera del rango', () => {
        const busqueda = { ...busquedaBase, precioMin: 220000, precioMax: 350000 }

        expect(calcularCompatibilidad(busqueda, publicacionBase)).toBe(0)
        expect(calcularCompatibilidad(busqueda, { ...publicacionBase, precio: 900000 })).toBe(0)
    })

    it('trata el rango de precio como un solo criterio', () => {
        const busqueda = { ...busquedaBase, precioMin: 100000, precioMax: 200000 }

        expect(calcularCompatibilidad(busqueda, publicacionBase)).toBe(100)
    })

    it('trata modalidad y tipo como excluyentes', () => {
        const otroTipo = { ...busquedaBase, tipoInmueble: 'casa' as const, precioMax: 200000 }
        const otraModalidad = { ...busquedaBase, modalidad: 'temporario' as const, precioMax: 200000 }

        expect(calcularCompatibilidad(otroTipo, publicacionBase)).toBe(0)
        expect(calcularCompatibilidad(otraModalidad, publicacionBase)).toBe(0)
    })

    it('no suma modalidad y tipo al porcentaje', () => {
        const busqueda = {
            ...busquedaBase,
            modalidad: 'residencial' as const,
            tipoInmueble: 'departamento' as const,
            precioMax: 100,
        }

        expect(calcularCompatibilidad(busqueda, publicacionBase)).toBe(0)
    })

    it('calcula la proporción de criterios cumplidos', () => {
        const busqueda = { ...busquedaBase, precioMax: 200000, ambientesMin: 2, aceptaMascotas: true }

        expect(calcularCompatibilidad(busqueda, { ...publicacionBase, ambientes: 3 })).toBe(67)
    })
})
