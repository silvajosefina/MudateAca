import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import {
    BarChart3,
    Heart,
    Home,
    LayoutList,
    LogIn,
    Menu,
    MessageCircle,
    SearchCheck,
    ShieldCheck,
    UserPlus,
    X,
} from 'lucide-react'
import { cerrarSesion, obtenerSesion } from '../mocks/sesion'
import { useMensajesNoLeidos } from '../hooks/useMensajesNoLeidos'
import MenuUsuario from './MenuUsuario'
import MenuNotificaciones from './MenuNotificaciones'
import type { Rol } from '../types/usuario'

interface EnlaceNav {
    to: string
    label: string
    Icono: typeof Home
}

const ENLACES_POR_ROL: Record<Rol, EnlaceNav[]> = {
    propietario: [
        { to: '/mis-publicaciones', label: 'Mis publicaciones', Icono: LayoutList },
        { to: '/panel-demanda', label: 'Panel de demanda', Icono: BarChart3 },
    ],
    inmobiliaria: [
        { to: '/mis-publicaciones', label: 'Mis publicaciones', Icono: LayoutList },
        { to: '/panel-demanda', label: 'Panel de demanda', Icono: BarChart3 },
    ],
    administrador: [{ to: '/panel-administracion', label: 'Panel de administración', Icono: ShieldCheck }],
    interesado: [
        { to: '/mis-busquedas', label: 'Mis búsquedas', Icono: SearchCheck },
        { to: '/favoritos', label: 'Favoritos', Icono: Heart },
    ],
}

function Header() {
    const sesion = obtenerSesion()
    const navigate = useNavigate()
    const location = useLocation()
    const noLeidos = useMensajesNoLeidos(sesion?.id)
    const [menuAbierto, setMenuAbierto] = useState(false)

    const enlaces = sesion ? ENLACES_POR_ROL[sesion.rol] : []
    const mostrarMensajes = sesion && sesion.rol !== 'administrador'

    function handleCerrarSesion() {
        setMenuAbierto(false)
        cerrarSesion()
        navigate('/login')
    }

    function claseEnlace(to: string) {
        const activo = location.pathname === to
        return `inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border-b-2 transition-colors cursor-pointer ${
            activo ? 'text-primary border-primary' : 'text-foreground border-transparent hover:bg-primary-subtle'
        }`
    }

    const enlacesNav = (
        <>
            <Link to="/explorar" onClick={() => setMenuAbierto(false)} className={claseEnlace('/explorar')}>
                <Home className="w-4 h-4" aria-hidden="true" />
                Inicio
            </Link>
            {enlaces.map((enlace) => (
                <Link
                    key={enlace.to}
                    to={enlace.to}
                    onClick={() => setMenuAbierto(false)}
                    className={claseEnlace(enlace.to)}
                >
                    <enlace.Icono className="w-4 h-4" aria-hidden="true" />
                    {enlace.label}
                </Link>
            ))}
            {mostrarMensajes && (
                <Link
                    to="/mensajes"
                    onClick={() => setMenuAbierto(false)}
                    className={`relative ${claseEnlace('/mensajes')}`}
                >
                    <MessageCircle className="w-4 h-4" aria-hidden="true" />
                    Mensajes
                    {noLeidos > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] rounded-full bg-danger text-white text-[10px] font-bold px-1">
                            {noLeidos > 9 ? '9+' : noLeidos}
                        </span>
                    )}
                </Link>
            )}
        </>
    )

    const accesosSesion = sesion ? (
        <>
            <MenuNotificaciones usuarioId={sesion.id} />
            <MenuUsuario sesion={sesion} onCerrarSesion={handleCerrarSesion} />
        </>
    ) : (
        <>
            <Link
                to="/login"
                onClick={() => setMenuAbierto(false)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 text-foreground hover:bg-primary-subtle transition-colors cursor-pointer"
            >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                Iniciar sesión
            </Link>
            <Link
                to="/registro"
                onClick={() => setMenuAbierto(false)}
                className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-surface text-sm font-semibold rounded-lg px-3 py-2 transition-colors cursor-pointer"
            >
                <UserPlus className="w-4 h-4" aria-hidden="true" />
                Registrarme
            </Link>
        </>
    )

    // En el panel mobile los triggers quedan pegados al borde derecho (justify-end);
    // el dropdown de notificaciones es el más ancho, así que va último para que le
    // sobre lugar hacia la izquierda y no se corte contra el borde de la pantalla.
    const accesosSesionMobile = sesion ? (
        <>
            <MenuUsuario sesion={sesion} onCerrarSesion={handleCerrarSesion} />
            <MenuNotificaciones usuarioId={sesion.id} />
        </>
    ) : (
        <>
            <Link
                to="/login"
                onClick={() => setMenuAbierto(false)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 text-foreground hover:bg-primary-subtle transition-colors cursor-pointer"
            >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                Iniciar sesión
            </Link>
            <Link
                to="/registro"
                onClick={() => setMenuAbierto(false)}
                className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-surface text-sm font-semibold rounded-lg px-3 py-2 transition-colors cursor-pointer"
            >
                <UserPlus className="w-4 h-4" aria-hidden="true" />
                Registrarme
            </Link>
        </>
    )

    return (
        <header className="sticky top-0 z-30 bg-[var(--color-header-footer-bg)] border-b border-border">
            <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
                <Link
                    to="/explorar"
                    className="inline-flex items-center gap-2 text-xl font-heading font-bold text-brand cursor-pointer"
                >
                    <Home className="w-5 h-5" aria-hidden="true" />
                    Mudate Acá
                </Link>

                <nav className="hidden sm:flex flex-wrap items-center gap-2">
                    {enlacesNav}
                    {accesosSesion}
                </nav>

                <button
                    type="button"
                    onClick={() => setMenuAbierto((a) => !a)}
                    aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
                    aria-expanded={menuAbierto}
                    className="sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-foreground hover:bg-primary-subtle transition-colors cursor-pointer shrink-0"
                >
                    {menuAbierto ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
                </button>
            </div>

            {menuAbierto && (
                <nav className="sm:hidden border-t border-border px-4 py-3 flex flex-col items-start gap-1 bg-[var(--color-header-footer-bg)]">
                    {enlacesNav}
                    <div className="flex items-center justify-end gap-2 flex-wrap mt-2 pt-3 border-t border-border w-full">
                        {accesosSesionMobile}
                    </div>
                </nav>
            )}
        </header>
    )
}

export default Header
