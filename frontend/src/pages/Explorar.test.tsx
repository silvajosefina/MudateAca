import type { ReactNode } from 'react'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import Explorar from './Explorar'
import { listarMisPublicaciones, listarPublicaciones } from '../servicios/publicaciones'
import { obtenerSesion } from '../servicios/sesion'
import { obtenerVistaListado } from '../utils/preferenciasVista'
import type { Publicacion } from '../types/publicacion'
import type { Filtros } from '../utils/filtrosExplorar'

jest.mock('../layouts/PublicoLayout', () => ({ children }: { children: ReactNode }) => children)
jest.mock('../components/TarjetaPublicacion', () => ({ publicacion }: { publicacion: Publicacion }) => (
    <div>{publicacion.descripcion}</div>
))
jest.mock('../servicios/publicaciones', () => ({
    listarPublicaciones: jest.fn(),
    listarMisPublicaciones: jest.fn(),
}))
jest.mock('../servicios/sesion', () => ({ obtenerSesion: jest.fn() }))
jest.mock('../servicios/busquedas', () => ({ crearBusqueda: jest.fn() }))
jest.mock('../utils/preferenciasVista', () => ({
    obtenerVistaListado: jest.fn(),
    guardarVistaListado: jest.fn(),
}))
jest.mock('../utils/toast', () => ({ mostrarToast: jest.fn() }))

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

// Simula el filtrado que hace el backend con los mismos criterios que usa cada prueba.
async function listarComoLaApi(filtros: Filtros) {
    const resultados = [depto, casa, habitacionTemporaria].filter(
        (p) =>
            (filtros.modalidad === 'todas' || p.modalidad === filtros.modalidad) &&
            (filtros.tipoInmueble === 'todos' || p.tipoInmueble === filtros.tipoInmueble) &&
            p.ubicacion.toLowerCase().includes(filtros.ubicacion.trim().toLowerCase()),
    )
    return { count: resultados.length, next: null, previous: null, results: resultados }
}

beforeEach(() => {
    jest.mocked(listarPublicaciones).mockImplementation(listarComoLaApi)
    jest.mocked(listarMisPublicaciones).mockResolvedValue({ count: 0, next: null, previous: null, results: [], totales: {} })
    jest.mocked(obtenerSesion).mockReturnValue(null)
    jest.mocked(obtenerVistaListado).mockReturnValue('grilla')
})

afterEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
})

describe('Explorar - filtros de búsqueda', () => {
    test('renderiza el listado completo de publicaciones activas sin filtros', async () => {
        renderExplorar()
        expect(await screen.findByText('Departamento Centro')).toBeInTheDocument()
        expect(screen.getByText('Casa Barrio Norte')).toBeInTheDocument()
        expect(screen.getByText('Habitación Zona Terminal')).toBeInTheDocument()
        expect(screen.getByText('Publicaciones disponibles')).toBeInTheDocument()
    })

    test('tipear en "Ubicación o zona" no filtra antes del debounce, y sí después', async () => {
        jest.useFakeTimers()
        const user = userEvent.setup({ delay: null })
        renderExplorar()

        expect(await screen.findByText('Casa Barrio Norte')).toBeInTheDocument()
        await user.type(screen.getByPlaceholderText('Barrio, ciudad'), 'Centro')

        // Antes de que venza el debounce no se consulta a la API con el texto nuevo.
        expect(screen.getByText('Casa Barrio Norte')).toBeInTheDocument()
        expect(listarPublicaciones).not.toHaveBeenCalledWith(expect.objectContaining({ ubicacion: 'Centro' }), 1)

        await act(async () => {
            jest.advanceTimersByTime(300)
        })

        expect(listarPublicaciones).toHaveBeenCalledWith(expect.objectContaining({ ubicacion: 'Centro' }), 1)
        expect(await screen.findByText('1 publicación(es) encontrada(s).')).toBeInTheDocument()
        expect(screen.getByText('Departamento Centro')).toBeInTheDocument()
        expect(screen.queryByText('Casa Barrio Norte')).not.toBeInTheDocument()
        expect(screen.queryByText('Habitación Zona Terminal')).not.toBeInTheDocument()
    })

    test('seleccionar un tipo de inmueble filtra el listado al instante', async () => {
        const user = userEvent.setup()
        renderExplorar()

        await screen.findByText('Departamento Centro')
        await user.selectOptions(obtenerSelectTipoInmueble(), 'casa')

        expect(listarPublicaciones).toHaveBeenLastCalledWith(expect.objectContaining({ tipoInmueble: 'casa' }), 1)
        expect(await screen.findByText('1 publicación(es) encontrada(s).')).toBeInTheDocument()
        expect(screen.getByText('Casa Barrio Norte')).toBeInTheDocument()
        expect(screen.queryByText('Departamento Centro')).not.toBeInTheDocument()
        expect(screen.queryByText('Habitación Zona Terminal')).not.toBeInTheDocument()
    })

    test('seleccionar la pestaña "Residencial" filtra por modalidad', async () => {
        const user = userEvent.setup()
        renderExplorar()

        await screen.findByText('Habitación Zona Terminal')
        await user.click(screen.getByRole('button', { name: 'Residencial' }))

        expect(await screen.findByText('2 publicación(es) encontrada(s).')).toBeInTheDocument()
        expect(screen.getByText('Departamento Centro')).toBeInTheDocument()
        expect(screen.getByText('Casa Barrio Norte')).toBeInTheDocument()
        expect(screen.queryByText('Habitación Zona Terminal')).not.toBeInTheDocument()
    })

    test('"Limpiar filtros" restablece el listado completo', async () => {
        const user = userEvent.setup()
        renderExplorar()

        await screen.findByText('Departamento Centro')
        await user.selectOptions(obtenerSelectTipoInmueble(), 'casa')
        expect(await screen.findByText('1 publicación(es) encontrada(s).')).toBeInTheDocument()
        expect(screen.queryByText('Departamento Centro')).not.toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: /Limpiar filtros/ }))

        expect(await screen.findByText('Departamento Centro')).toBeInTheDocument()
        expect(screen.getByText('Casa Barrio Norte')).toBeInTheDocument()
        expect(screen.getByText('Habitación Zona Terminal')).toBeInTheDocument()
    })

    test('muestra el error de la API si no puede cargar las publicaciones', async () => {
        jest.mocked(listarPublicaciones).mockRejectedValue(
            Object.assign(new Error('Network Error'), { isAxiosError: true }),
        )
        renderExplorar()
        expect(
            await screen.findByText('No se pudo conectar con el servidor. Revisá tu conexión.'),
        ).toBeInTheDocument()
    })

    test('en temporario muestra la duración de la estadía y la envía como filtro', async () => {
        const user = userEvent.setup()
        renderExplorar()
        await screen.findByText('Departamento Centro')

        await user.click(screen.getByRole('button', { name: 'Temporario' }))
        await user.type(screen.getByPlaceholderText('Sin indicar'), '7')

        expect(listarPublicaciones).toHaveBeenLastCalledWith(
            expect.objectContaining({ modalidad: 'temporario', duracionEstadia: 7 }),
            1,
        )
    })
})
