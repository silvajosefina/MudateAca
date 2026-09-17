import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { obtenerSesion } from '../mocks/sesion'
import type { Rol } from '../types/usuario'

interface RutaPrivadaProps {
    children: ReactNode
    rolesPermitidos?: Rol[]
}

function RutaPrivada({ children, rolesPermitidos }: RutaPrivadaProps) {
    const sesion = obtenerSesion()

    if (!sesion) {
        return <Navigate to="/login" replace />
    }

    if (rolesPermitidos && !rolesPermitidos.includes(sesion.rol)) {
        return <Navigate to="/login" replace />
    }

    return <>{children}</>
}

export default RutaPrivada
