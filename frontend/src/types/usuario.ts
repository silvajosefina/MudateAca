export type Rol = 'interesado' | 'propietario' | 'inmobiliaria' | 'administrador'
export type EstadoVerificacion = 'pendiente' | 'verificado' | 'rechazado'

export interface Usuario {
    id: string
    nombre: string
    apellido: string
    correo: string
    contrasena: string
    rol: Rol
    estadoVerificacion: EstadoVerificacion
    motivoRechazo?: string
}

export type SesionUsuario = Omit<Usuario, 'contrasena'>
