import { useState } from 'react'

export interface BarraDato {
    etiqueta: string
    valor: number
}

interface GraficoBarrasProps {
    datos: BarraDato[]
    color?: string
    formatoValor?: (valor: number) => string
}

const COLOR_DEFECTO = 'bg-primary'

function GraficoBarras({ datos, color = COLOR_DEFECTO, formatoValor }: GraficoBarrasProps) {
    const [indiceActivo, setIndiceActivo] = useState<number | null>(null)
    const maximo = Math.max(1, ...datos.map((d) => d.valor))

    return (
        <div className="flex flex-col gap-3" role="img" aria-label="Gráfico de barras">
            {datos.map((dato, indice) => {
                const porcentaje = Math.max(2, Math.round((dato.valor / maximo) * 100))
                const activo = indiceActivo === indice
                return (
                    <div
                        key={dato.etiqueta}
                        className="flex items-center gap-3"
                        onMouseEnter={() => setIndiceActivo(indice)}
                        onMouseLeave={() => setIndiceActivo(null)}
                    >
                        <span className="text-sm text-foreground w-32 sm:w-40 shrink-0 truncate" title={dato.etiqueta}>
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
                    </div>
                )
            })}
        </div>
    )
}

export default GraficoBarras
