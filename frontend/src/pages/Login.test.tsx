import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import Login from './Login'
import { MOCK_USUARIOS } from '../mocks/usuarios'
import { iniciarSesion } from '../mocks/sesion'
import type { Usuario } from '../types/usuario'

const mockNavigate = jest.fn()

jest.mock('react-router', () => ({
    ...jest.requireActual('react-router'),
    useNavigate: () => mockNavigate,
}))

jest.mock('../mocks/usuarios', () => ({ MOCK_USUARIOS: [] }))
jest.mock('../mocks/sesion', () => ({ iniciarSesion: jest.fn() }))

function crearUsuario(overrides: Partial<Usuario>): Usuario {
    return {
        id: 'u1',
        nombre: 'Ana',
        apellido: 'Gómez',
        celular: '2392400000',
        correo: 'ana@mudateaca.com',
        contrasena: 'Clave123',
        rol: 'interesado',
        estadoVerificacion: 'verificado',
        estadoCuenta: 'activo',
        ...overrides,
    }
}

const usuarioInteresado = crearUsuario({ id: 'u1', correo: 'interesado@mudateaca.com', rol: 'interesado' })
const usuarioPropietario = crearUsuario({ id: 'u2', correo: 'propietario@mudateaca.com', rol: 'propietario' })
const usuarioInmobiliaria = crearUsuario({ id: 'u3', correo: 'inmobiliaria@mudateaca.com', rol: 'inmobiliaria' })
const usuarioAdmin = crearUsuario({ id: 'u4', correo: 'admin@mudateaca.com', rol: 'administrador' })
const usuarioSuspendido = crearUsuario({
    id: 'u5',
    correo: 'suspendido@mudateaca.com',
    estadoCuenta: 'suspendido',
    motivoSuspension: 'Reportes reiterados de otros usuarios.',
})

function renderLogin() {
    return render(
        <MemoryRouter>
            <Login />
        </MemoryRouter>,
    )
}

async function completarYEnviar(correo: string, contrasena: string) {
    renderLogin()
    const user = userEvent.setup()
    if (correo) await user.type(screen.getByPlaceholderText('Correo electrónico'), correo)
    if (contrasena) await user.type(screen.getByPlaceholderText('Contraseña'), contrasena)
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
}

beforeEach(() => {
    MOCK_USUARIOS.length = 0
    MOCK_USUARIOS.push(usuarioInteresado, usuarioPropietario, usuarioInmobiliaria, usuarioAdmin, usuarioSuspendido)
})

afterEach(() => {
    jest.clearAllMocks()
})

describe('Login', () => {
    test('renderiza los campos de correo, contraseña y el botón de ingreso', () => {
        renderLogin()
        expect(screen.getByPlaceholderText('Correo electrónico')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    })

    test('muestra errores de validación cuando se envía el formulario vacío', async () => {
        await completarYEnviar('', '')
        expect(await screen.findByText('Ingresá tu correo electrónico.')).toBeInTheDocument()
        expect(screen.getByText('Ingresá tu contraseña.')).toBeInTheDocument()
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    test('muestra error cuando el correo tiene formato inválido', async () => {
        await completarYEnviar('correo-invalido', 'Clave123')
        expect(await screen.findByText('Ingresá un correo electrónico válido.')).toBeInTheDocument()
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    test('muestra "Usuario o contraseña incorrectos" con credenciales que no coinciden', async () => {
        await completarYEnviar('interesado@mudateaca.com', 'ClaveIncorrecta1')
        expect(await screen.findByText('Usuario o contraseña incorrectos.')).toBeInTheDocument()
        expect(iniciarSesion).not.toHaveBeenCalled()
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    test('muestra el motivo de suspensión y no inicia sesión si la cuenta está suspendida', async () => {
        await completarYEnviar('suspendido@mudateaca.com', 'Clave123')
        expect(
            await screen.findByText(/Tu cuenta está suspendida\. Motivo: Reportes reiterados de otros usuarios\./),
        ).toBeInTheDocument()
        expect(iniciarSesion).not.toHaveBeenCalled()
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    test.each([
        ['interesado@mudateaca.com', '/explorar'],
        ['propietario@mudateaca.com', '/mis-publicaciones'],
        ['inmobiliaria@mudateaca.com', '/mis-publicaciones'],
        ['admin@mudateaca.com', '/panel-administracion'],
    ])('con credenciales válidas (%s) inicia sesión y navega a %s', async (correo, rutaEsperada) => {
        await completarYEnviar(correo, 'Clave123')
        expect(iniciarSesion).toHaveBeenCalledTimes(1)
        expect(mockNavigate).toHaveBeenCalledWith(rutaEsperada)
    })
})
