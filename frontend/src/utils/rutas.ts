import type { Rol } from '../types/usuario'

// Pantalla donde arranca cada rol al iniciar sesión o al entrar al sitio con la sesión abierta.
const INICIO_POR_ROL: Record<Rol, string> = {
    interesado: '/explorar',
    propietario: '/mis-publicaciones',
    inmobiliaria: '/mis-publicaciones',
    administrador: '/panel-administracion',
}

// Sin sesión, el inicio es Explorar: las publicaciones se pueden ver sin registrarse (RF-11).
export function rutaDeInicio(rol?: Rol): string {
    return rol ? INICIO_POR_ROL[rol] : '/explorar'
}
