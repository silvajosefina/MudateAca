import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import PublicacionForm from './PublicacionForm'
import { actualizarPublicacion } from '../mocks/publicaciones'
import type { Publicacion } from '../types/publicacion'

jest.mock('../mocks/publicaciones', () => ({
    actualizarPublicacion: jest.fn(() => ({ estado: 'activa' })),
    crearPublicacion: jest.fn(),
}))
jest.mock('../mocks/sesion', () => ({ obtenerSesion: () => ({ id: 'u2', rol: 'propietario' }) }))
jest.mock('../mocks/toast', () => ({ mostrarToast: jest.fn() }))
jest.mock('./Mapa', () => ({
    __esModule: true,
    default: ({ lat, onCambiarPosicion }: { lat?: number; onCambiarPosicion: (lat: number, lng: number) => void }) => (
        <button type="button" onClick={() => onCambiarPosicion(-35.1, -62.2)}>
            {lat === undefined ? 'Mapa sin marcador' : 'Mapa con marcador'}
        </button>
    ),
}))

const publicacionBase: Publicacion = {
    id: 'pub_1',
    propietarioId: 'u2',
    tipoInmueble: 'departamento',
    modalidad: 'residencial',
    descripcion: 'Departamento luminoso cerca del centro.',
    precio: 180000,
    ubicacion: 'Centro',
    ambientes: 2,
    dormitorios: 1,
    disponibleDesde: '2026-11-01',
    fotos: ['a.jpg', 'b.jpg', 'c.jpg'],
    serviciosIncluidos: false,
    amueblado: false,
    aceptaMascotas: false,
    aptoEstudiantes: false,
    estado: 'activa',
    creadaEn: '2026-10-01T10:00:00.000Z',
    actualizadaEn: '2026-10-01T10:00:00.000Z',
}

function renderFormulario(publicacion: Publicacion) {
    return render(
        <MemoryRouter>
            <PublicacionForm modo="editar" publicacionExistente={publicacion} />
        </MemoryRouter>,
    )
}

function datosEnviados() {
    return (actualizarPublicacion as jest.Mock).mock.calls[0][1]
}

describe('PublicacionForm: ubicación en el mapa', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('no envía coordenadas si el usuario no interactuó con el mapa', async () => {
        const user = userEvent.setup()
        renderFormulario(publicacionBase)

        expect(screen.getByRole('button', { name: 'Mapa sin marcador' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Quitar ubicación' })).not.toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

        expect(datosEnviados().lat).toBeUndefined()
        expect(datosEnviados().lng).toBeUndefined()
    })

    it('envía las coordenadas marcadas en el mapa', async () => {
        const user = userEvent.setup()
        renderFormulario(publicacionBase)

        await user.click(screen.getByRole('button', { name: 'Mapa sin marcador' }))
        await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

        expect(datosEnviados().lat).toBe(-35.1)
        expect(datosEnviados().lng).toBe(-62.2)
    })

    it('conserva las coordenadas que la publicación ya tenía', async () => {
        const user = userEvent.setup()
        renderFormulario({ ...publicacionBase, lat: -35.9, lng: -62.7 })

        expect(screen.getByRole('button', { name: 'Mapa con marcador' })).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

        expect(datosEnviados().lat).toBe(-35.9)
        expect(datosEnviados().lng).toBe(-62.7)
    })

    it('permite quitar la ubicación', async () => {
        const user = userEvent.setup()
        renderFormulario({ ...publicacionBase, lat: -35.9, lng: -62.7 })

        await user.click(screen.getByRole('button', { name: 'Quitar ubicación' }))

        expect(screen.getByRole('button', { name: 'Mapa sin marcador' })).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

        expect(datosEnviados().lat).toBeUndefined()
        expect(datosEnviados().lng).toBeUndefined()
    })
})
