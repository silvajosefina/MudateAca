import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import PublicacionPreviewModal from './PublicacionPreviewModal'
import type { Publicacion } from '../types/publicacion'

jest.mock('./CarruselFotos', () => ({ __esModule: true, default: () => <div>Carrusel</div> }))

const publicacionObservada: Publicacion = {
    id: 'pub_1',
    propietarioId: 'u2',
    tipoInmueble: 'casa',
    modalidad: 'residencial',
    descripcion: 'Casa residencial.',
    precio: 800000,
    ubicacion: 'Villegas 450',
    ambientes: 2,
    dormitorios: 2,
    disponibleDesde: '2026-11-01',
    fotos: ['a.jpg', 'b.jpg', 'c.jpg'],
    serviciosIncluidos: false,
    amueblado: false,
    aceptaMascotas: false,
    aptoEstudiantes: false,
    estado: 'observada',
    creadaEn: '2026-11-20T10:00:00.000Z',
    actualizadaEn: '2026-11-20T10:00:00.000Z',
    eventosModeracion: [
        {
            id: 'ev_1',
            publicacionId: 'pub_1',
            tipo: 'solicitud_modificacion',
            nota: 'Agregale una descripción con más caracteres.',
            fecha: '2026-11-21T10:00:00.000Z',
        },
    ],
}

function renderPrevisualizacion(publicacion: Publicacion, permitirEditar?: boolean) {
    return render(
        <MemoryRouter>
            <PublicacionPreviewModal publicacion={publicacion} permitirEditar={permitirEditar} onClose={jest.fn()} />
        </MemoryRouter>,
    )
}

describe('PublicacionPreviewModal: historial de revisión', () => {
    test('el dueño ve el historial y la nota del administrador en Mis publicaciones', () => {
        renderPrevisualizacion(publicacionObservada)

        expect(screen.getByText('Historial de revisión')).toBeInTheDocument()
        expect(screen.getByText('Modificaciones solicitadas')).toBeInTheDocument()
        expect(screen.getByText('Agregale una descripción con más caracteres.')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /editar/i })).toBeInTheDocument()
    })

    test('el administrador también ve el historial', () => {
        renderPrevisualizacion(publicacionObservada, false)

        expect(screen.getByText('Historial de revisión')).toBeInTheDocument()
        expect(screen.queryByRole('link', { name: /editar/i })).not.toBeInTheDocument()
    })

    test('sin eventos de moderación no muestra la sección', () => {
        renderPrevisualizacion({ ...publicacionObservada, eventosModeracion: undefined })

        expect(screen.queryByText('Historial de revisión')).not.toBeInTheDocument()
    })
})
