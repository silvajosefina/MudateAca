import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import Registro from './Registro'
import { MOCK_USUARIOS } from '../mocks/usuarios'
import type { Usuario } from '../types/usuario'

jest.mock('../mocks/usuarios', () => ({ MOCK_USUARIOS: [] }))

const usuarioExistente: Usuario = {
    id: 'u1',
    nombre: 'Ana',
    apellido: 'Gómez',
    celular: '2392400000',
    correo: 'ya.registrado@mudateaca.com',
    contrasena: 'Clave123',
    rol: 'interesado',
    estadoVerificacion: 'verificado',
    estadoCuenta: 'activo',
}

function renderRegistro() {
    return render(
        <MemoryRouter>
            <Registro />
        </MemoryRouter>,
    )
}

interface DatosFormulario {
    nombre?: string
    apellido?: string
    celular?: string
    correo?: string
    contrasena?: string
}

async function completarFormulario(datos: DatosFormulario) {
    const user = userEvent.setup()
    if (datos.nombre) await user.type(screen.getByPlaceholderText('Nombre'), datos.nombre)
    if (datos.apellido) await user.type(screen.getByPlaceholderText('Apellido'), datos.apellido)
    if (datos.celular) await user.type(screen.getByPlaceholderText('Celular'), datos.celular)
    if (datos.correo) await user.type(screen.getByPlaceholderText('Correo electrónico'), datos.correo)
    if (datos.contrasena) await user.type(screen.getByPlaceholderText('Contraseña'), datos.contrasena)
    return user
}

const DATOS_VALIDOS: Required<DatosFormulario> = {
    nombre: 'Ana',
    apellido: 'Gómez',
    celular: '2392400001',
    correo: 'nueva@mudateaca.com',
    contrasena: 'Clave123',
}

beforeEach(() => {
    MOCK_USUARIOS.length = 0
    MOCK_USUARIOS.push(usuarioExistente)
})

afterEach(() => {
    jest.restoreAllMocks()
})

describe('Registro', () => {
    test('renderiza todos los campos del formulario', () => {
        renderRegistro()
        expect(screen.getByPlaceholderText('Nombre')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Apellido')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Celular')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Correo electrónico')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument()
        expect(screen.getByRole('combobox')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Registrarme' })).toBeInTheDocument()
    })

    test('muestra errores de nombre y apellido vacíos', async () => {
        renderRegistro()
        const user = await completarFormulario({})
        await user.click(screen.getByRole('button', { name: 'Registrarme' }))
        expect(await screen.findByText('Ingresá tu nombre.')).toBeInTheDocument()
        expect(screen.getByText('Ingresá tu apellido.')).toBeInTheDocument()
    })

    test('muestra error de celular vacío y de formato inválido', async () => {
        renderRegistro()
        let user = await completarFormulario({ nombre: 'Ana', apellido: 'Gómez' })
        await user.click(screen.getByRole('button', { name: 'Registrarme' }))
        expect(await screen.findByText('Ingresá tu número de celular.')).toBeInTheDocument()

        user = await completarFormulario({ celular: 'abc' })
        await user.click(screen.getByRole('button', { name: 'Registrarme' }))
        expect(await screen.findByText('Ingresá un número de celular válido.')).toBeInTheDocument()
    })

    test('muestra error de correo vacío, con formato inválido y ya registrado', async () => {
        renderRegistro()
        let user = await completarFormulario({ nombre: 'Ana', apellido: 'Gómez', celular: '2392400001' })
        await user.click(screen.getByRole('button', { name: 'Registrarme' }))
        expect(await screen.findByText('Ingresá tu correo electrónico.')).toBeInTheDocument()

        user = await completarFormulario({ correo: 'correo-invalido' })
        await user.click(screen.getByRole('button', { name: 'Registrarme' }))
        expect(await screen.findByText('Ingresá un correo electrónico válido.')).toBeInTheDocument()

        await user.clear(screen.getByPlaceholderText('Correo electrónico'))
        user = await completarFormulario({ correo: 'ya.registrado@mudateaca.com' })
        await user.click(screen.getByRole('button', { name: 'Registrarme' }))
        expect(await screen.findByText('Este correo ya está registrado.')).toBeInTheDocument()
    })

    // A diferencia de los demás campos, Registro.tsx no muestra el texto específico
    // del error de contraseña: solo colorea en rojo el hint estático de requisitos.
    test('marca la contraseña como inválida cuando está vacía o no cumple el patrón', async () => {
        renderRegistro()
        let user = await completarFormulario({
            nombre: 'Ana',
            apellido: 'Gómez',
            celular: '2392400001',
            correo: 'nueva@mudateaca.com',
        })
        await user.click(screen.getByRole('button', { name: 'Registrarme' }))
        expect(await screen.findByText(/Debe tener al menos 8 caracteres/)).toHaveClass('text-danger')

        user = await completarFormulario({ contrasena: 'sinnumeroniminayuscula' })
        await user.click(screen.getByRole('button', { name: 'Registrarme' }))
        expect(screen.getByText(/Debe tener al menos 8 caracteres/)).toHaveClass('text-danger')
    })

    test('cambiar el select de rol actualiza el valor seleccionado', async () => {
        renderRegistro()
        const user = userEvent.setup()
        const select = screen.getByRole('combobox') as HTMLSelectElement
        expect(select.value).toBe('interesado')
        await user.selectOptions(select, 'propietario')
        expect(select.value).toBe('propietario')
    })

    test('con todos los datos válidos no muestra errores y envía los datos', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)
        renderRegistro()
        const user = await completarFormulario(DATOS_VALIDOS)
        await user.selectOptions(screen.getByRole('combobox'), 'propietario')
        await user.click(screen.getByRole('button', { name: 'Registrarme' }))

        expect(screen.queryByText('Ingresá tu nombre.')).not.toBeInTheDocument()
        expect(screen.queryByText('Ingresá un correo electrónico válido.')).not.toBeInTheDocument()
        expect(screen.queryByText('La contraseña no cumple los requisitos.')).not.toBeInTheDocument()
        expect(logSpy).toHaveBeenCalledWith(
            expect.objectContaining({ ...DATOS_VALIDOS, rol: 'propietario' }),
        )
    })
})
