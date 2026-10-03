import type { EstadoVerificacion, Usuario } from '../types/usuario'
import { crearNotificacion } from './notificaciones'

export const MOCK_USUARIOS: Usuario[] = [
    {
        id: 'u1',
        nombre: 'Usuario',
        apellido: 'Interesado',
        nombreUsuario: 'usuario.interesado',
        celular: '2392400001',
        correo: 'usuario@mudateaca.com',
        contrasena: 'Usuario1',
        rol: 'interesado',
        estadoVerificacion: 'pendiente',
    },
    {
        id: 'u2',
        nombre: 'Usuario',
        apellido: 'Propietario',
        nombreUsuario: 'usuario.propietario',
        celular: '2392400002',
        correo: 'propietario@mudateaca.com',
        contrasena: 'Propietario1',
        rol: 'propietario',
        estadoVerificacion: 'verificado',
    },
    {
        id: 'u3',
        nombre: 'Usuario',
        apellido: 'Inmobiliaria',
        nombreUsuario: 'usuario.inmobiliaria',
        celular: '2392400003',
        correo: 'inmobiliaria@mudateaca.com',
        contrasena: 'Inmobiliaria1',
        rol: 'inmobiliaria',
        estadoVerificacion: 'pendiente',
    },
    {
        id: 'u4',
        nombre: 'Usuario',
        apellido: 'Rechazado',
        nombreUsuario: 'usuario.rechazado',
        celular: '2392400004',
        correo: 'rechazado@mudateaca.com',
        contrasena: 'Rechazado1',
        rol: 'propietario',
        estadoVerificacion: 'rechazado',
        motivoRechazo: 'La documentación cargada no coincide con el domicilio declarado.',
    },
    {
        id: 'u5',
        nombre: 'Usuario',
        apellido: 'Administrador',
        nombreUsuario: 'usuario.administrador',
        celular: '2392400005',
        correo: 'administrador@mudateaca.com',
        contrasena: 'Administrador1',
        rol: 'administrador',
        estadoVerificacion: 'verificado',
    },
]

export function obtenerUsuarioPorId(id: string): Usuario | undefined {
    return MOCK_USUARIOS.find((u) => u.id === id)
}

export function actualizarUsuario(
    id: string,
    cambios: Pick<Usuario, 'nombre' | 'apellido' | 'correo' | 'nombreUsuario' | 'celular'>,
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
    crearNotificacion(usuario.id, mensaje, estado === 'verificado' ? 'exito' : 'error')

    return usuario
}