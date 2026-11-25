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
    rol: Rol
    // Solo las inmobiliarias: sus publicaciones se muestran con este nombre (RF-21).
    razonSocial?: string
    estadoCuenta: EstadoCuenta
    motivoSuspension?: string
}

// Los datos del usuario que se guardan para dibujar la interfaz; nunca la contraseña ni los tokens.
export type SesionUsuario = Usuario
