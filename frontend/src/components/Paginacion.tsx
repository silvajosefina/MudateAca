import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginacionProps {
    paginaActual: number
    totalPaginas: number
    onCambiarPagina: (pagina: number) => void
}

function numerosAMostrar(paginaActual: number, totalPaginas: number): (number | 'gap')[] {
    const paginas: (number | 'gap')[] = []
    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
        const esExtremo = pagina === 1 || pagina === totalPaginas
        const esCercana = Math.abs(pagina - paginaActual) <= 1
        if (esExtremo || esCercana) {
            paginas.push(pagina)
        } else if (paginas[paginas.length - 1] !== 'gap') {
            paginas.push('gap')
        }
    }
    return paginas
}

function Paginacion({ paginaActual, totalPaginas, onCambiarPagina }: PaginacionProps) {
    if (totalPaginas <= 1) return null

    return (
        <nav aria-label="Paginación de resultados" className="flex items-center justify-center gap-1.5 mt-6">
            <button
                type="button"
                onClick={() => onCambiarPagina(paginaActual - 1)}
                disabled={paginaActual === 1}
                aria-label="Página anterior"
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:text-foreground"
            >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>

            {numerosAMostrar(paginaActual, totalPaginas).map((pagina, indice) =>
                pagina === 'gap' ? (
                    <span key={`gap-${indice}`} className="px-1 text-sm text-muted select-none">
                        …
                    </span>
                ) : (
                    <button
                        key={pagina}
                        type="button"
                        onClick={() => onCambiarPagina(pagina)}
                        aria-current={pagina === paginaActual ? 'page' : undefined}
                        className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${pagina === paginaActual
                            ? 'bg-primary text-foreground'
                            : 'border border-border text-foreground hover:border-primary hover:text-primary'
                            }`}
                    >
                        {pagina}
                    </button>
                ),
            )}

            <button
                type="button"
                onClick={() => onCambiarPagina(paginaActual + 1)}
                disabled={paginaActual === totalPaginas}
                aria-label="Página siguiente"
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:text-foreground"
            >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
        </nav>
    )
}

export default Paginacion
