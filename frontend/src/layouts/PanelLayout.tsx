import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { BarChart3, Home, LayoutList, MessageCircle, ShieldCheck } from 'lucide-react'
import { cerrarSesion, obtenerSesion } from '../mocks/sesion'
import { useMensajesNoLeidos } from '../hooks/useMensajesNoLeidos'
import MenuUsuario from '../components/MenuUsuario'
import Footer from '../components/Footer'
import type { Rol } from '../types/usuario'

interface PanelLayoutProps {
    children: ReactNode
}

const ENLACES_POR_ROL: Record<Rol, { to: string; label: string; Icono: typeof Home }[]> = {
    propietario: [
        { to: '/explorar', label: 'Inicio', Icono: Home },
        { to: '/mis-publicaciones', label: 'Mis publicaciones', Icono: LayoutList },
        { to: '/panel-demanda', label: 'Panel de demanda', Icono: BarChart3 },
    ],
    inmobiliaria: [
        { to: '/explorar', label: 'Inicio', Icono: Home },
        { to: '/mis-publicaciones', label: 'Mis publicaciones', Icono: LayoutList },
        { to: '/panel-demanda', label: 'Panel de demanda', Icono: BarChart3 },
    ],
    administrador: [
        { to: '/explorar', label: 'Inicio', Icono: Home },
        { to: '/panel-administracion', label: 'Panel de administración', Icono: ShieldCheck },
    ],
    interesado: [{ to: '/explorar', label: 'Inicio', Icono: Home }],
}

function PanelLayout({ children }: PanelLayoutProps) {
    const sesion = obtenerSesion()
    const navigate = useNavigate()
    const location = useLocation()
    const noLeidos = useMensajesNoLeidos(sesion?.id)
    const enlaces = sesion ? ENLACES_POR_ROL[sesion.rol] : []
    const mostrarMensajes = sesion && sesion.rol !== 'administrador'

    function handleCerrarSesion() {
        cerrarSesion()
        navigate('/login')
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="sticky top-0 z-30 bg-surface border-b border-border">
                <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <Link to="/explorar" className="text-xl font-heading font-bold text-primary">
                        Mudate Acá
                    </Link>
                    <nav className="flex flex-wrap items-center gap-2">
                        {enlaces.map((enlace) => (
                            <Link
                                key={enlace.label}
                                to={enlace.to}
                                className={`inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 transition-colors cursor-pointer ${location.pathname === enlace.to
                                    ? 'bg-primary text-foreground'
                                    : 'text-foreground hover:bg-primary-subtle'
                                    }`}
                            >
                                <enlace.Icono className="w-4 h-4" aria-hidden="true" />
                                {enlace.label}
                            </Link>
                        ))}
                        {mostrarMensajes && (
                            <Link
                                to="/mensajes"
                                className={`relative inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 transition-colors cursor-pointer ${location.pathname === '/mensajes'
                                    ? 'bg-primary text-foreground'
                                    : 'text-foreground hover:bg-primary-subtle'
                                    }`}
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
                        {sesion && <MenuUsuario sesion={sesion} onCerrarSesion={handleCerrarSesion} />}
                    </nav>
                </div>
            </header>
            <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8 flex-1 w-full">{children}</main>
            <Footer />
        </div>
    )
}

export default PanelLayout
