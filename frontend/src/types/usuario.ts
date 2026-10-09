export type Rol = 'interesado' | 'propietario' | 'inmobiliaria' | 'administrador'
export type EstadoVerificacion = 'pendiente' | 'verificado' | 'rechazado'
export type EstadoCuenta = 'activo' | 'pendiente' | 'suspendido'

export const ETIQUETAS_ROL: Record<Rol, string> = {
    interesado: 'Interesado',
    propietario: 'Propietario',
    inmobiliaria: 'Inmobiliaria',
    administrador: 'Administrador',
}

export const ETIQUETAS_ESTADO_CUENTA: Record<EstadoCuenta, { texto: string; clase: string }> = {
    activo: { texto: 'Activo', clase: 'bg-accent-subtle text-accent' },
    pendiente: { texto: 'Pendiente', clase: 'bg-warning-subtle text-warning' },
    suspendido: { texto: 'Suspendido', clase: 'bg-danger-subtle text-danger' },
}

export const ETIQUETAS_ESTADO_VERIFICACION: Record<EstadoVerificacion, { texto: string; clase: string }> = {
    pendiente: { texto: 'Verificación pendiente', clase: 'bg-warning-subtle text-warning' },
    verificado: { texto: 'Cuenta verificada', clase: 'bg-accent-subtle text-accent' },
    rechazado: { texto: 'Verificación rechazada', clase: 'bg-danger-subtle text-danger' },
}

export interface Usuario {
    id: string
    nombre: string
    apellido: string
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
