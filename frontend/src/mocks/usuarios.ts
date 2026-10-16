import type { EstadoCuenta, Usuario } from '../types/usuario'
import { crearNotificacion } from './notificaciones'

export const MOCK_USUARIOS: Usuario[] = [
    {
        id: 'u1',
        nombre: 'Usuario',
        apellido: 'Interesado',
        celular: '2392400001',
        correo: 'usuario@mudateaca.com',
        contrasena: 'Usuario1',
        rol: 'interesado',
        estadoCuenta: 'activo',
    },
    {
        id: 'u2',
        nombre: 'Usuario',
        apellido: 'Propietario',
        celular: '2392400002',
        correo: 'propietario@mudateaca.com',
        contrasena: 'Propietario1',
        rol: 'propietario',
        estadoCuenta: 'activo',
    },
    {
        id: 'u3',
        nombre: 'Usuario',
        apellido: 'Inmobiliaria',
        celular: '2392400003',
        correo: 'inmobiliaria@mudateaca.com',
        contrasena: 'Inmobiliaria1',
        rol: 'inmobiliaria',
        estadoCuenta: 'activo',
    },
    {
        id: 'u4',
        nombre: 'Usuario',
        apellido: 'Propietario Dos',
        celular: '2392400004',
        correo: 'propietario2@mudateaca.com',
        contrasena: 'Propietario1',
        rol: 'propietario',
        estadoCuenta: 'activo',
    },
    {
        id: 'u5',
        nombre: 'Usuario',
        apellido: 'Administrador',
        celular: '2392400005',
        correo: 'administrador@mudateaca.com',
        contrasena: 'Administrador1',
        rol: 'administrador',
        estadoCuenta: 'activo',
    },
]

export function obtenerUsuarioPorId(id: string): Usuario | undefined {
    return MOCK_USUARIOS.find((u) => u.id === id)
}

export function actualizarUsuario(
    id: string,
    cambios: Pick<Usuario, 'nombre' | 'apellido' | 'correo' | 'celular'>,
): Usuario | undefined {
    const usuario = MOCK_USUARIOS.find((u) => u.id === id)
    if (!usuario) return undefined
    Object.assign(usuario, cambios)
    return usuario
}

export function obtenerTodosLosUsuarios(): Usuario[] {
    return MOCK_USUARIOS
}

export function suspenderUsuario(id: string, motivo: string): Usuario | undefined {
    const usuario = MOCK_USUARIOS.find((u) => u.id === id)
    if (!usuario) return undefined
    usuario.estadoCuenta = 'suspendido'
    usuario.motivoSuspension = motivo
    crearNotificacion(usuario.id, `Tu cuenta fue suspendida. Motivo: ${motivo}`, 'error')
    return usuario
}

export function reactivarUsuario(id: string): Usuario | undefined {
    const usuario = MOCK_USUARIOS.find((u) => u.id === id)
    if (!usuario) return undefined
    usuario.estadoCuenta = 'activo'
    usuario.motivoSuspension = undefined
    crearNotificacion(usuario.id, 'Tu cuenta fue reactivada. Ya podés iniciar sesión con normalidad.', 'exito')
    return usuario
}

export function cambiarEstadoCuentaUsuario(id: string, estado: EstadoCuenta): Usuario | undefined {
    const usuario = MOCK_USUARIOS.find((u) => u.id === id)
    if (!usuario) return undefined
    usuario.estadoCuenta = estado
    if (estado !== 'suspendido') usuario.motivoSuspension = undefined
    return usuario
}