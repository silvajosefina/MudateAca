import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Heart, Home, LayoutList, LogIn, MessageCircle, SearchCheck, UserPlus } from 'lucide-react'
import { cerrarSesion, obtenerSesion } from '../mocks/sesion'
import { useMensajesNoLeidos } from '../hooks/useMensajesNoLeidos'
import MenuUsuario from '../components/MenuUsuario'
import Footer from '../components/Footer'

interface PublicoLayoutProps {
    children: ReactNode
}

const ROLES_CON_PANEL = ['propietario', 'inmobiliaria']

function PublicoLayout({ children }: PublicoLayoutProps) {
    const sesion = obtenerSesion()
    const navigate = useNavigate()
    const noLeidos = useMensajesNoLeidos(sesion?.id)

    function handleCerrarSesion() {
        cerrarSesion()
        navigate('/login')
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="sticky top-0 z-30 bg-surface border-b border-border">
                <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <Link to="/explorar" className="inline-flex items-center gap-2 text-xl font-heading font-bold text-primary cursor-pointer">
                        <Home className="w-5 h-5" aria-hidden="true" />
                        Mudate Acá
                    </Link>

                    <nav className="flex flex-wrap items-center gap-2">
                        <Link
                            to="/explorar"
                            className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 text-foreground hover:bg-primary-subtle transition-colors cursor-pointer"
                        >
                            <Home className="w-4 h-4" aria-hidden="true" />
                            Inicio
                        </Link>
                        {sesion ? (
                            <>
                                {ROLES_CON_PANEL.includes(sesion.rol) && (
                                    <Link
                                        to="/mis-publicaciones"
                                        className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 text-foreground hover:bg-primary-subtle transition-colors cursor-pointer"
                                    >
                                        <LayoutList className="w-4 h-4" aria-hidden="true" />
                                        Mi panel
                                    </Link>
                                )}
                                {sesion.rol === 'interesado' && (
                                    <>
                                        <Link
                                            to="/mis-busquedas"
                                            className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 text-foreground hover:bg-primary-subtle transition-colors cursor-pointer"
                                        >
                                            <SearchCheck className="w-4 h-4" aria-hidden="true" />
                                            Mis búsquedas
                                        </Link>
                                        <Link
                                            to="/favoritos"
                                            className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 text-foreground hover:bg-primary-subtle transition-colors cursor-pointer"
                                        >
                                            <Heart className="w-4 h-4" aria-hidden="true" />
                                            Favoritos
                                        </Link>
                                    </>
                                )}
                                {(sesion.rol === 'interesado' || ROLES_CON_PANEL.includes(sesion.rol)) && (
                                    <Link
                                        to="/mensajes"
                                        className="relative inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 text-foreground hover:bg-primary-subtle transition-colors cursor-pointer"
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
                                <MenuUsuario sesion={sesion} onCerrarSesion={handleCerrarSesion} />
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 text-foreground hover:bg-primary-subtle transition-colors cursor-pointer"
                                >
                                    <LogIn className="w-4 h-4" aria-hidden="true" />
                                    Iniciar sesión
                                </Link>
                                <Link
                                    to="/registro"
                                    className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-foreground text-sm font-semibold rounded-lg px-3 py-2 transition-colors cursor-pointer"
                                >
                                    <UserPlus className="w-4 h-4" aria-hidden="true" />
                                    Registrarme
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            </header>
            <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8 flex-1 w-full">{children}</main>
            <Footer />
        </div>
    )
}

export default PublicoLayout
