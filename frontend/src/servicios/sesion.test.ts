import React from 'react'
import { act, renderHook } from '@testing-library/react'

jest.mock('./api', () => ({ EVENTO_SESION_VENCIDA: 'mudateaca:sesion-vencida' }))
jest.mock('./usuarios', () => ({ obtenerPerfil: jest.fn(), salir: jest.fn() }))

const PERFIL = { id: 1, nombre: 'Ana', apellido: 'Gómez', correo: 'ana@mudateaca.test', rol: 'administrador', estado: 'activo' }

// Cada prueba carga la sesión de nuevo, porque guarda en memoria si ya se validó.
// React se comparte con Testing Library para no tener dos copias.
function cargarModulos() {
    let modulos!: { sesion: typeof import('./sesion'); usuarios: { obtenerPerfil: jest.Mock } }
    jest.isolateModules(() => {
        jest.doMock('react', () => React)
        modulos = {
            sesion: jest.requireActual<typeof import('./sesion')>('./sesion'),
            usuarios: jest.requireMock<{ obtenerPerfil: jest.Mock }>('./usuarios'),
        }
    })
    return modulos
}

beforeEach(() => {
    localStorage.clear()
})

describe('validarSesion', () => {
    test('borra el perfil guardado si la sesión ya venció', async () => {
        localStorage.setItem('mudateaca_sesion', JSON.stringify(PERFIL))
        const { sesion, usuarios } = cargarModulos()
        usuarios.obtenerPerfil.mockRejectedValue({ isAxiosError: true, response: { status: 401 } })

        await sesion.validarSesion()

        expect(sesion.obtenerSesion()).toBeNull()
    })

    test('actualiza el perfil si la sesión sigue vigente', async () => {
        localStorage.setItem('mudateaca_sesion', JSON.stringify(PERFIL))
        const { sesion, usuarios } = cargarModulos()
        usuarios.obtenerPerfil.mockResolvedValue({ ...PERFIL, nombre: 'Ana María' })

        await sesion.validarSesion()

        expect(sesion.obtenerSesion()?.nombre).toBe('Ana María')
    })

    test('conserva el perfil si no se pudo conectar con el servidor', async () => {
        localStorage.setItem('mudateaca_sesion', JSON.stringify(PERFIL))
        const { sesion, usuarios } = cargarModulos()
        usuarios.obtenerPerfil.mockRejectedValue({ isAxiosError: true })

        await sesion.validarSesion()

        expect(sesion.obtenerSesion()).toEqual(PERFIL)
    })
})

describe('useSesionValidada', () => {
    test('pasa a true recién cuando el backend responde por la sesión guardada', async () => {
        localStorage.setItem('mudateaca_sesion', JSON.stringify(PERFIL))
        const { sesion, usuarios } = cargarModulos()
        let responder!: (error: unknown) => void
        usuarios.obtenerPerfil.mockReturnValue(new Promise((_, rechazar) => (responder = rechazar)))
        const { result } = renderHook(() => sesion.useSesionValidada())

        const validacion = sesion.validarSesion()
        expect(result.current).toBe(false)

        await act(async () => {
            responder({ isAxiosError: true, response: { status: 401 } })
            await validacion
        })
        expect(result.current).toBe(true)
    })

    test('sin perfil guardado se valida sin consultar al backend', async () => {
        const { sesion, usuarios } = cargarModulos()
        const { result } = renderHook(() => sesion.useSesionValidada())

        await act(() => sesion.validarSesion())

        expect(result.current).toBe(true)
        expect(usuarios.obtenerPerfil).not.toHaveBeenCalled()
    })
})
