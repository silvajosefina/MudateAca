import type { Usuario } from '../types/usuario'

export const MOCK_USUARIOS: Usuario[] = [
    {
        id: 'u1',
        nombre: 'Usuario',
        apellido: 'Interesado',
        correo: 'usuario@mudateaca.com',
        contrasena: 'Usuario1',
        rol: 'interesado',
        estadoVerificacion: 'pendiente',
    },
    {
        id: 'u2',
        nombre: 'Usuario',
        apellido: 'Propietario',
        correo: 'propietario@mudateaca.com',
        contrasena: 'Propietario1',
        rol: 'propietario',
        estadoVerificacion: 'verificado',
    },
    {
        id: 'u3',
        nombre: 'Usuario',
        apellido: 'Inmobiliaria',
        correo: 'inmobiliaria@mudateaca.com',
        contrasena: 'Inmobiliaria1',
        rol: 'inmobiliaria',
        estadoVerificacion: 'pendiente',
    },
    {
        id: 'u4',
        nombre: 'Usuario',
        apellido: 'Rechazado',
        correo: 'rechazado@mudateaca.com',
        contrasena: 'Rechazado1',
        rol: 'propietario',
        estadoVerificacion: 'rechazado',
        motivoRechazo: 'La documentación cargada no coincide con el domicilio declarado.',
    },
]