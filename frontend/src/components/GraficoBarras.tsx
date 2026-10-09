import { useState } from 'react'
import { Link } from 'react-router'

export interface BarraDato {
    etiqueta: string
    valor: number
    href?: string
}

interface GraficoBarrasProps {
    datos: BarraDato[]
    color?: string
    formatoValor?: (valor: number) => string
    anchoEtiqueta?: string
}

const COLOR_DEFECTO = 'bg-primary'
const ANCHO_ETIQUETA_DEFECTO = 'w-32 sm:w-40'

function GraficoBarras({ datos, color = COLOR_DEFECTO, formatoValor, anchoEtiqueta = ANCHO_ETIQUETA_DEFECTO }: GraficoBarrasProps) {
    const [indiceActivo, setIndiceActivo] = useState<number | null>(null)
    const maximo = Math.max(1, ...datos.map((d) => d.valor))

    return (
        <div className="flex flex-col gap-3" role="img" aria-label="Gráfico de barras">
            {datos.map((dato, indice) => {
                const porcentaje = Math.max(2, Math.round((dato.valor / maximo) * 100))
                const activo = indiceActivo === indice

                const contenido = (
                    <>
                        <span className={`text-sm text-foreground ${anchoEtiqueta} shrink-0 truncate`} title={dato.etiqueta}>
                            {dato.etiqueta}
                        </span>
                        <div className="flex-1 h-5 rounded-full bg-surface-hover overflow-hidden relative">
                            <div
                                className={`h-full rounded-full transition-[width] duration-300 ${color} ${activo ? 'opacity-80' : ''}`}
                                style={{ width: `${porcentaje}%` }}
                            />
                        </div>
                        <span className="text-xs font-semibold text-foreground w-12 text-right shrink-0">
                            {formatoValor ? formatoValor(dato.valor) : dato.valor}
                        </span>
                    </>
                )

                return dato.href ? (
                    <Link
                        key={dato.etiqueta}
                        to={dato.href}
                        onMouseEnter={() => setIndiceActivo(indice)}
                        onMouseLeave={() => setIndiceActivo(null)}
                        className="flex items-center gap-3 -mx-2 px-2 py-1 rounded-lg cursor-pointer hover:bg-surface-hover transition-colors"
                    >
                        {contenido}
                    </Link>
                ) : (
                    <div
                        key={dato.etiqueta}
                        className="flex items-center gap-3"
                        onMouseEnter={() => setIndiceActivo(indice)}
                        onMouseLeave={() => setIndiceActivo(null)}
                    >
                        {contenido}
                    </div>
                )
            })}
        </div>
    )
}

export default GraficoBarras
