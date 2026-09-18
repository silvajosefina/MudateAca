import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { LayoutList, LogOut, ShieldCheck } from 'lucide-react'
import { cerrarSesion, obtenerSesion } from '../mocks/sesion'
import ToastViewport from '../components/ToastViewport'

interface PanelLayoutProps {
    children: ReactNode
}

const ENLACES = [
    { to: '/mis-publicaciones', label: 'Mis publicaciones', Icono: LayoutList },
    { to: '/verificacion', label: 'Verificación', Icono: ShieldCheck },
]

function PanelLayout({ children }: PanelLayoutProps) {
    const sesion = obtenerSesion()
    const navigate = useNavigate()
    const location = useLocation()

    function handleCerrarSesion() {
        cerrarSesion()
        navigate('/login')
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-30 bg-surface border-b border-border">
                <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <Link to="/mis-publicaciones" className="text-xl font-heading font-bold text-primary">
                            Mudate Acá
                        </Link>
                        {sesion && (
                            <p className="text-sm text-muted">
                                {sesion.nombre} {sesion.apellido} ·{' '}
                                {sesion.rol === 'inmobiliaria' ? 'Inmobiliaria' : 'Propietario'}
                            </p>
                        )}
                    </div>
                    <nav className="flex flex-wrap gap-2">
                        {ENLACES.map((enlace) => (
                            <Link
                                key={enlace.to}
                                to={enlace.to}
                                className={`inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 transition-colors cursor-pointer ${location.pathname === enlace.to
                                    ? 'bg-primary text-white'
                                    : 'text-foreground hover:bg-primary-subtle'
                                    }`}
                            >
                                <enlace.Icono className="w-4 h-4" aria-hidden="true" />
                                {enlace.label}
                            </Link>
                        ))}
                        <button
                            type="button"
                            onClick={handleCerrarSesion}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 text-foreground hover:bg-primary-subtle transition-colors cursor-pointer"
                        >
                            <LogOut className="w-4 h-4" aria-hidden="true" />
                            Cerrar sesión
                        </button>
                    </nav>
                </div>
            </header>
            <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">{children}</main>
            <ToastViewport />
        </div>
    )
}

export default PanelLayout
