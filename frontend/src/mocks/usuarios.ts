import type { EstadoCuenta, EstadoVerificacion, Usuario } from '../types/usuario'
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
        estadoVerificacion: 'pendiente',
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
        estadoVerificacion: 'verificado',
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
        estadoVerificacion: 'pendiente',
        estadoCuenta: 'activo',
    },
    {
        id: 'u4',
        nombre: 'Usuario',
        apellido: 'Rechazado',
        celular: '2392400004',
        correo: 'rechazado@mudateaca.com',
        contrasena: 'Rechazado1',
        rol: 'propietario',
        estadoVerificacion: 'rechazado',
        motivoRechazo: 'La documentación cargada no coincide con el domicilio declarado.',
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
        estadoVerificacion: 'verificado',
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

export function obtenerInmobiliariasPendientes(): Usuario[] {
    return MOCK_USUARIOS.filter((u) => u.rol === 'inmobiliaria' && u.estadoVerificacion === 'pendiente')
}

export function actualizarEstadoVerificacionUsuario(
    id: string,
    estado: EstadoVerificacion,
    motivoRechazo?: string,
): Usuario | undefined {
    const usuario = MOCK_USUARIOS.find((u) => u.id === id)
    if (!usuario) return undefined
    usuario.estadoVerificacion = estado
    usuario.motivoRechazo = motivoRechazo

    const mensaje =
        estado === 'verificado'
            ? 'Tu cuenta de inmobiliaria fue verificada. Ya podés crear publicaciones.'
            : `Tu verificación de inmobiliaria fue rechazada. Motivo: ${motivoRechazo}`
    crearNotificacion(
        usuario.id,
        mensaje,
        estado === 'verificado' ? 'exito' : 'error',
        estado === 'verificado' ? '/publicaciones/nueva' : undefined,
    )

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