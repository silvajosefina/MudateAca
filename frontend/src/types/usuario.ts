export type Rol = 'interesado' | 'propietario' | 'inmobiliaria' | 'administrador'
export type EstadoVerificacion = 'pendiente' | 'verificado' | 'rechazado'
export type EstadoCuenta = 'activo' | 'pendiente' | 'suspendido'

export interface Usuario {
    id: string
    nombre: string
    apellido: string
    nombreUsuario: string
    celular: string
    correo: string
    contrasena: string
    rol: Rol
    estadoVerificacion: EstadoVerificacion
    motivoRechazo?: string
    estadoCuenta: EstadoCuenta
    motivoSuspension?: string
}

export type SesionUsuario = Omit<Usuario, 'contrasena'>
