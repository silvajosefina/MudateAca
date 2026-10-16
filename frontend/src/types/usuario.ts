export type Rol = 'interesado' | 'propietario' | 'inmobiliaria' | 'administrador'
export type EstadoCuenta = 'activo' | 'suspendido'

export const ETIQUETAS_ROL: Record<Rol, string> = {
    interesado: 'Interesado',
    propietario: 'Propietario',
    inmobiliaria: 'Inmobiliaria',
    administrador: 'Administrador',
}

export const ETIQUETAS_ESTADO_CUENTA: Record<EstadoCuenta, { texto: string; clase: string }> = {
    activo: { texto: 'Activo', clase: 'bg-accent-subtle text-accent' },
    suspendido: { texto: 'Suspendido', clase: 'bg-danger-subtle text-danger' },
}

export interface Usuario {
    id: string
    nombre: string
    apellido: string
    celular: string
    correo: string
    contrasena: string
    rol: Rol
    estadoCuenta: EstadoCuenta
    motivoSuspension?: string
}

export type SesionUsuario = Omit<Usuario, 'contrasena'>
