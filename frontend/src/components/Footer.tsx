import { Link } from 'react-router'
import { Home, Mail, MapPin } from 'lucide-react'

function Footer() {
    const anio = new Date().getFullYear()

    return (
        <footer className="border-t border-border bg-surface mt-auto">
            <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <Link to="/explorar" className="inline-flex items-center gap-1.5 text-base font-heading font-bold text-primary">
                        <Home className="w-4 h-4" aria-hidden="true" />
                        Mudate Acá
                    </Link>
                    <p className="text-xs text-muted mt-1">
                        Encontrá o publicá alquileres de forma simple en Trenque Lauquen.
                    </p>
                </div>
                <div className="flex flex-col gap-1.5 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        Trenque Lauquen, Buenos Aires, Argentina
                    </span>
                    <a href="mailto:contacto@mudateaca.com" className="inline-flex items-center gap-1.5 hover:text-primary transition-colors">
                        <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        contacto@mudateaca.com
                    </a>
                </div>
            </div>
            <div className="border-t border-border">
                <p className="max-w-6xl mx-auto px-4 py-3 text-xs text-muted text-center">
                    © {anio} Mudate Acá. Todos los derechos reservados.
                </p>
            </div>
        </footer>
    )
}

export default Footer
