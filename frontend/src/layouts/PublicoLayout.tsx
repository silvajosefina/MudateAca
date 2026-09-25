import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { LayoutList, LogIn, LogOut, Search, UserPlus } from 'lucide-react'
import { cerrarSesion, obtenerSesion } from '../mocks/sesion'

interface PublicoLayoutProps {
    children: ReactNode
}

const ROLES_CON_PANEL = ['propietario', 'inmobiliaria']

function PublicoLayout({ children }: PublicoLayoutProps) {
    const sesion = obtenerSesion()
    const navigate = useNavigate()

    function handleCerrarSesion() {
        cerrarSesion()
        navigate('/login')
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-30 bg-surface border-b border-border">
                <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <Link to="/explorar" className="inline-flex items-center gap-2 text-xl font-heading font-bold text-primary cursor-pointer">
                        <Search className="w-5 h-5" aria-hidden="true" />
                        Mudate Acá
                    </Link>

                    <nav className="flex flex-wrap items-center gap-2">
                        {sesion ? (
                            <>
                                <span className="text-sm text-muted">
                                    {sesion.nombre} {sesion.apellido}
                                </span>
                                {ROLES_CON_PANEL.includes(sesion.rol) && (
                                    <Link
                                        to="/mis-publicaciones"
                                        className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 text-foreground hover:bg-primary-subtle transition-colors cursor-pointer"
                                    >
                                        <LayoutList className="w-4 h-4" aria-hidden="true" />
                                        Mi panel
                                    </Link>
                                )}
                                <button
                                    type="button"
                                    onClick={handleCerrarSesion}
                                    className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 text-foreground hover:bg-primary-subtle transition-colors cursor-pointer"
                                >
                                    <LogOut className="w-4 h-4" aria-hidden="true" />
                                    Cerrar sesión
                                </button>
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
            <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">{children}</main>
        </div>
    )
}

export default PublicoLayout
