import { useState } from 'react'

export interface PuntoTendencia {
    etiqueta: string
    valor: number
}

interface GraficoTendenciaProps {
    puntos: PuntoTendencia[]
}

const ANCHO = 560
const ALTO_TRAZADO = 112
const PADDING_LATERAL = 24
const PADDING_SUPERIOR = 24
// Separado del padding superior a propósito: la etiqueta del eje X necesita su
// propia franja de aire debajo de la línea base para no quedar pegada/cortada
// contra el borde inferior de la tarjeta.
const PADDING_INFERIOR = 36
const ALTO = PADDING_SUPERIOR + ALTO_TRAZADO + PADDING_INFERIOR
const Y_LINEA_BASE = PADDING_SUPERIOR + ALTO_TRAZADO

function GraficoTendencia({ puntos }: GraficoTendenciaProps) {
    const [indiceActivo, setIndiceActivo] = useState<number | null>(null)

    if (puntos.length === 0) return null

    const maximo = Math.max(1, ...puntos.map((p) => p.valor))
    const pasoX = puntos.length > 1 ? (ANCHO - PADDING_LATERAL * 2) / (puntos.length - 1) : 0

    const coordenadas = puntos.map((punto, indice) => {
        const x = PADDING_LATERAL + indice * pasoX
        const y = Y_LINEA_BASE - (punto.valor / maximo) * ALTO_TRAZADO
        return { x, y, punto }
    })

    const lineaPath = coordenadas.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
    const areaPath = `${lineaPath} L ${coordenadas[coordenadas.length - 1].x} ${Y_LINEA_BASE} L ${coordenadas[0].x} ${Y_LINEA_BASE} Z`

    return (
        <div className="relative w-full">
            <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full h-auto overflow-visible" role="img" aria-label="Evolución de búsquedas activas">
                <line x1={PADDING_LATERAL} y1={Y_LINEA_BASE} x2={ANCHO - PADDING_LATERAL} y2={Y_LINEA_BASE} stroke="var(--color-border)" strokeWidth="1" />
                <path d={areaPath} fill="var(--color-primary)" fillOpacity="0.12" stroke="none" />
                <path d={lineaPath} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {coordenadas.map((c, indice) => {
                    const esPrimero = indice === 0
                    const esUltimo = indice === coordenadas.length - 1
                    const anclaEtiqueta = esPrimero ? 'start' : esUltimo ? 'end' : 'middle'
                    const anclaValor = esPrimero ? 'start' : esUltimo ? 'end' : 'middle'
                    return (
                        <g key={c.punto.etiqueta}>
                            <circle
                                cx={c.x}
                                cy={c.y}
                                r={indiceActivo === indice ? 6 : 4}
                                fill="var(--color-primary)"
                                stroke="var(--color-surface)"
                                strokeWidth="2"
                                className="transition-[r] cursor-pointer"
                                onMouseEnter={() => setIndiceActivo(indice)}
                                onMouseLeave={() => setIndiceActivo(null)}
                            />
                            {indiceActivo === indice && (
                                <text x={c.x} y={c.y - 12} textAnchor={anclaValor} fontSize="12" fontWeight="600" fill="var(--color-foreground)">
                                    {c.punto.valor}
                                </text>
                            )}
                            <text x={c.x} y={Y_LINEA_BASE + 20} textAnchor={anclaEtiqueta} fontSize="10" fill="var(--color-muted)">
                                {c.punto.etiqueta}
                            </text>
                        </g>
                    )
                })}
            </svg>
        </div>
    )
}

export default GraficoTendencia
