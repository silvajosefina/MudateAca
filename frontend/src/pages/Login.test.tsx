import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import Login from './Login'
import { iniciarSesion } from '../servicios/sesion'
import { ingresar } from '../servicios/usuarios'
import type { SesionUsuario } from '../types/usuario'

const mockNavigate = jest.fn()

jest.mock('react-router', () => ({
    ...jest.requireActual('react-router'),
    useNavigate: () => mockNavigate,
}))

jest.mock('../servicios/sesion', () => ({ iniciarSesion: jest.fn() }))
jest.mock('../servicios/usuarios', () => ({ ingresar: jest.fn() }))

const mockIngresar = ingresar as jest.MockedFunction<typeof ingresar>

function crearUsuario(overrides: Partial<SesionUsuario>): SesionUsuario {
    return {
        id: '1',
        nombre: 'Ana',
        apellido: 'Gómez',
        celular: '2392400000',
        correo: 'ana@mudateaca.com',
        rol: 'interesado',
        estadoCuenta: 'activo',
        ...overrides,
    }
}

// Error con la forma que devuelve axios cuando la API responde con un código de error.
function errorDeApi(status: number, data: unknown) {
    return Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status, data } })
}

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
        expect(mockIngresar).not.toHaveBeenCalled()
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    test.each([
        ['correo-invalido', 'sin arroba ni dominio'],
        ['correo@', 'sin dominio'],
        ['@mudateaca.com', 'sin usuario'],
        ['correo con espacios@mudateaca.com', 'con espacios'],
    ])('muestra error cuando el correo tiene formato inválido: "%s" (%s)', async (correoInvalido) => {
        await completarYEnviar(correoInvalido, 'Clave123')
        expect(await screen.findByText('Ingresá un correo electrónico válido.')).toBeInTheDocument()
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    test('muestra "Usuario o contraseña incorrectos" con credenciales que no coinciden', async () => {
        mockIngresar.mockRejectedValue(errorDeApi(401, { detail: 'Usuario o contraseña incorrectos.' }))
        await completarYEnviar('interesado@mudateaca.com', 'ClaveIncorrecta1')
        expect(await screen.findByText('Usuario o contraseña incorrectos.')).toBeInTheDocument()
        expect(iniciarSesion).not.toHaveBeenCalled()
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    test('muestra el motivo de suspensión y no inicia sesión si la cuenta está suspendida', async () => {
        mockIngresar.mockRejectedValue(
            errorDeApi(400, {
                non_field_errors: ['Tu cuenta está suspendida. Motivo: Reportes reiterados de otros usuarios.'],
            }),
        )
        await completarYEnviar('suspendido@mudateaca.com', 'Clave123')
        expect(
            await screen.findByText(/Tu cuenta está suspendida\. Motivo: Reportes reiterados de otros usuarios\./),
        ).toBeInTheDocument()
        expect(iniciarSesion).not.toHaveBeenCalled()
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    test('avisa cuando no se puede conectar con el servidor', async () => {
        mockIngresar.mockRejectedValue(Object.assign(new Error('Network Error'), { isAxiosError: true }))
        await completarYEnviar('interesado@mudateaca.com', 'Clave123')
        expect(await screen.findByText('No se pudo conectar con el servidor. Revisá tu conexión.')).toBeInTheDocument()
        expect(iniciarSesion).not.toHaveBeenCalled()
    })

    test.each([
        ['interesado', '/explorar'],
        ['propietario', '/mis-publicaciones'],
        ['inmobiliaria', '/mis-publicaciones'],
        ['administrador', '/panel-administracion'],
    ] as const)('con credenciales válidas de %s inicia sesión y navega a %s', async (rol, rutaEsperada) => {
        const usuario = crearUsuario({ correo: `${rol}@mudateaca.com`, rol })
        mockIngresar.mockResolvedValue(usuario)
        await completarYEnviar(usuario.correo, 'Clave123')
        expect(mockIngresar).toHaveBeenCalledWith(usuario.correo, 'Clave123')
        expect(iniciarSesion).toHaveBeenCalledWith(usuario)
        expect(mockNavigate).toHaveBeenCalledWith(rutaEsperada)
    })
})
