import type { ReactNode } from 'react'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import Explorar from './Explorar'
import { obtenerPublicacionesActivas } from '../mocks/publicaciones'
import { obtenerSesion } from '../mocks/sesion'
import { obtenerVistaListado } from '../mocks/preferenciasVista'
import type { Publicacion } from '../types/publicacion'

jest.mock('../layouts/PublicoLayout', () => ({ children }: { children: ReactNode }) => children)
jest.mock('../components/TarjetaPublicacion', () => ({ publicacion }: { publicacion: Publicacion }) => (
    <div>{publicacion.descripcion}</div>
))
jest.mock('../mocks/publicaciones', () => ({ obtenerPublicacionesActivas: jest.fn() }))
jest.mock('../mocks/sesion', () => ({ obtenerSesion: jest.fn() }))
jest.mock('../mocks/busquedasActivas', () => ({ crearBusqueda: jest.fn() }))
jest.mock('../mocks/preferenciasVista', () => ({
    obtenerVistaListado: jest.fn(),
    guardarVistaListado: jest.fn(),
}))
jest.mock('../mocks/toast', () => ({ mostrarToast: jest.fn() }))

function crearPublicacion(overrides: Partial<Publicacion>): Publicacion {
    return {
        id: 'pub1',
        propietarioId: 'u2',
        tipoInmueble: 'departamento',
        modalidad: 'residencial',
        descripcion: 'Departamento de prueba',
        precio: 100000,
        ubicacion: 'Centro, Trenque Lauquen',
        ambientes: 2,
        dormitorios: 1,
        disponibleDesde: '2026-01-01',
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

const depto = crearPublicacion({
    id: 'pub1',
    descripcion: 'Departamento Centro',
    tipoInmueble: 'departamento',
    modalidad: 'residencial',
    ubicacion: 'Centro, Trenque Lauquen',
})
const casa = crearPublicacion({
    id: 'pub2',
    descripcion: 'Casa Barrio Norte',
    tipoInmueble: 'casa',
    modalidad: 'residencial',
    ubicacion: 'Barrio Norte, Trenque Lauquen',
})
const habitacionTemporaria = crearPublicacion({
    id: 'pub3',
    descripcion: 'Habitación Zona Terminal',
    tipoInmueble: 'habitacion',
    modalidad: 'temporario',
    ubicacion: 'Zona Terminal, Trenque Lauquen',
})

// El <select> de "Tipo de inmueble" no tiene htmlFor/id asociado a su label,
// así que se identifica por ser el único combobox con la opción "Casa".
function obtenerSelectTipoInmueble() {
    return screen.getAllByRole('combobox').find((el) => within(el).queryByText('Casa')) as HTMLSelectElement
}

function renderExplorar() {
    return render(
        <MemoryRouter>
            <Explorar />
        </MemoryRouter>,
    )
}

beforeEach(() => {
    jest.mocked(obtenerPublicacionesActivas).mockReturnValue([depto, casa, habitacionTemporaria])
    jest.mocked(obtenerSesion).mockReturnValue(null)
    jest.mocked(obtenerVistaListado).mockReturnValue('grilla')
})

afterEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
})

describe('Explorar - filtros de búsqueda', () => {
    test('renderiza el listado completo de publicaciones activas sin filtros', () => {
        renderExplorar()
        expect(screen.getByText('Departamento Centro')).toBeInTheDocument()
        expect(screen.getByText('Casa Barrio Norte')).toBeInTheDocument()
        expect(screen.getByText('Habitación Zona Terminal')).toBeInTheDocument()
        expect(screen.getByText('Publicaciones disponibles')).toBeInTheDocument()
    })

    test('tipear en "Ubicación o zona" no filtra antes del debounce, y sí después', async () => {
        jest.useFakeTimers()
        const user = userEvent.setup({ delay: null })
        renderExplorar()

        await user.type(screen.getByPlaceholderText('Barrio, ciudad'), 'Centro')

        // Antes de que venza el debounce, el listado completo sigue visible.
        expect(screen.getByText('Casa Barrio Norte')).toBeInTheDocument()

        act(() => {
            jest.advanceTimersByTime(300)
        })

        expect(screen.getByText('Departamento Centro')).toBeInTheDocument()
        expect(screen.queryByText('Casa Barrio Norte')).not.toBeInTheDocument()
        expect(screen.queryByText('Habitación Zona Terminal')).not.toBeInTheDocument()
        expect(screen.getByText('1 publicación(es) encontrada(s).')).toBeInTheDocument()
    })

    test('seleccionar un tipo de inmueble filtra el listado al instante', async () => {
        const user = userEvent.setup()
        renderExplorar()

        await user.selectOptions(obtenerSelectTipoInmueble(), 'casa')

        expect(screen.getByText('Casa Barrio Norte')).toBeInTheDocument()
        expect(screen.queryByText('Departamento Centro')).not.toBeInTheDocument()
        expect(screen.queryByText('Habitación Zona Terminal')).not.toBeInTheDocument()
    })

    test('seleccionar la pestaña "Residencial" filtra por modalidad', async () => {
        const user = userEvent.setup()
        renderExplorar()

        await user.click(screen.getByRole('button', { name: 'Residencial' }))

        expect(screen.getByText('Departamento Centro')).toBeInTheDocument()
        expect(screen.getByText('Casa Barrio Norte')).toBeInTheDocument()
        expect(screen.queryByText('Habitación Zona Terminal')).not.toBeInTheDocument()
    })

    test('"Limpiar filtros" restablece el listado completo', async () => {
        const user = userEvent.setup()
        renderExplorar()

        await user.selectOptions(obtenerSelectTipoInmueble(), 'casa')
        expect(screen.queryByText('Departamento Centro')).not.toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: /Limpiar filtros/ }))

        expect(screen.getByText('Departamento Centro')).toBeInTheDocument()
        expect(screen.getByText('Casa Barrio Norte')).toBeInTheDocument()
        expect(screen.getByText('Habitación Zona Terminal')).toBeInTheDocument()
    })
})
