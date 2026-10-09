import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { LogOut, User } from 'lucide-react'
import type { SesionUsuario } from '../types/usuario'

interface MenuUsuarioProps {
    sesion: SesionUsuario
    onCerrarSesion: () => void
}

const ETIQUETA_ROL: Record<SesionUsuario['rol'], string> = {
    interesado: 'Interesado',
    propietario: 'Propietario',
    inmobiliaria: 'Inmobiliaria',
    administrador: 'Administrador',
}

const ETIQUETA_VERIFICACION: Record<NonNullable<SesionUsuario['estadoVerificacion']>, { texto: string; clase: string }> = {
    pendiente: { texto: 'Verificación pendiente', clase: 'bg-warning-subtle text-warning' },
    verificado: { texto: 'Cuenta verificada', clase: 'bg-accent-subtle text-accent' },
    rechazado: { texto: 'Verificación rechazada', clase: 'bg-danger-subtle text-danger' },
}

function MenuUsuario({ sesion, onCerrarSesion }: MenuUsuarioProps) {
    const [abierto, setAbierto] = useState(false)
    const contenedorRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickFuera(e: MouseEvent) {
            if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
                setAbierto(false)
            }
        }
        function handleEscape(e: KeyboardEvent) {
            if (e.key === 'Escape') setAbierto(false)
        }
        document.addEventListener('mousedown', handleClickFuera)
        document.addEventListener('keydown', handleEscape)
        return () => {
            document.removeEventListener('mousedown', handleClickFuera)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [])

    const iniciales = `${sesion.nombre.charAt(0)}${sesion.apellido.charAt(0)}`.toUpperCase()
    const mostrarVerificacion = sesion.rol === 'propietario' || sesion.rol === 'inmobiliaria'
    const verificacion = sesion.estadoVerificacion ? ETIQUETA_VERIFICACION[sesion.estadoVerificacion] : undefined

    return (
        <div className="relative" ref={contenedorRef}>
            <button
                type="button"
                onClick={() => setAbierto((a) => !a)}
                aria-haspopup="true"
                aria-expanded={abierto}
                aria-label="Cuenta"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary text-surface font-heading font-semibold text-sm hover:bg-primary-hover transition-colors cursor-pointer"
            >
                {iniciales}
            </button>

            {abierto && (
                <div className="absolute right-0 mt-2 w-64 bg-surface rounded-xl shadow-xl border border-border overflow-hidden z-40">
                    <div className="p-4 border-b border-border">
                        <p className="text-sm font-semibold text-foreground truncate">
                            {sesion.nombre} {sesion.apellido}
                        </p>
                        <p className="text-xs text-muted truncate">{sesion.correo}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-primary-subtle text-primary">
                                {ETIQUETA_ROL[sesion.rol]}
                            </span>
                            {mostrarVerificacion && verificacion && (
                                <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${verificacion.clase}`}>
                                    {verificacion.texto}
                                </span>
                            )}
                        </div>
                    </div>
                    <Link
                        to="/mi-cuenta"
                        onClick={() => setAbierto(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
                    >
                        <User className="w-4 h-4" aria-hidden="true" />
                        Editar usuario
                    </Link>
                    <button
                        type="button"
                        onClick={onCerrarSesion}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
                    >
                        <LogOut className="w-4 h-4" aria-hidden="true" />
                        Cerrar sesión
                    </button>
                </div>
            )}
        </div>
    )
}

export default MenuUsuario
