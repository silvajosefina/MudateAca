import { Images } from 'lucide-react'
import CarruselFotos from './CarruselFotos'

interface GaleriaMosaicoProps {
    fotos: string[]
    descripcion: string
    onAbrir: (indiceInicial: number) => void
}

const MAX_MINIATURAS = 4

function claseMiniatura(indice: number, totalMiniaturas: number): string {
    if (totalMiniaturas === 1) return 'col-span-2 row-span-2'
    if (totalMiniaturas === 2) return 'row-span-2'
    if (totalMiniaturas === 3 && indice === 0) return 'row-span-2'
    return ''
}

function GaleriaMosaico({ fotos, descripcion, onAbrir }: GaleriaMosaicoProps) {
    if (fotos.length === 0) {
        return (
            <div className="w-full aspect-video rounded-2xl overflow-hidden bg-surface-hover flex items-center justify-center text-sm text-muted">
                Sin fotografías
            </div>
        )
    }

    const miniaturas = fotos.slice(1, 1 + MAX_MINIATURAS)
    const restantes = fotos.length - 1 - miniaturas.length

    return (
        <>
            {/* Mobile: carrusel simple, la cuadrícula no se aprovecha en pantallas angostas */}
            <div className="sm:hidden relative">
                <CarruselFotos fotos={fotos} descripcion={descripcion} />
                <button
                    type="button"
                    onClick={() => onAbrir(0)}
                    className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-surface text-foreground text-xs font-semibold rounded-lg px-2.5 py-1.5 shadow-lg hover:bg-surface-hover transition-colors cursor-pointer"
                >
                    <Images className="w-3.5 h-3.5" aria-hidden="true" />
                    Ver las {fotos.length} fotos
                </button>
            </div>

            {/* Desktop/tablet: mosaico tipo galería */}
            <div className="hidden sm:grid relative grid-cols-4 grid-rows-2 gap-2 h-[420px] rounded-2xl overflow-hidden">
                <button
                    type="button"
                    onClick={() => onAbrir(0)}
                    className="col-span-2 row-span-2 relative group cursor-pointer"
                    aria-label="Ver foto principal en la galería"
                >
                    <img
                        src={fotos[0]}
                        alt={`Foto principal de ${descripcion}`}
                        className="w-full h-full object-cover group-hover:brightness-90 transition-[filter]"
                    />
                </button>

                {miniaturas.map((foto, indice) => {
                    const esUltimaConMas = indice === miniaturas.length - 1 && restantes > 0
                    return (
                        <button
                            key={indice}
                            type="button"
                            onClick={() => onAbrir(indice + 1)}
                            className={`relative group cursor-pointer ${claseMiniatura(indice, miniaturas.length)}`}
                            aria-label={esUltimaConMas ? `Ver las ${fotos.length} fotos de la galería` : `Ver foto ${indice + 2}`}
                        >
                            <img
                                src={foto}
                                alt={`Foto ${indice + 2} de ${descripcion}`}
                                className="w-full h-full object-cover group-hover:brightness-90 transition-[filter]"
                            />
                            {esUltimaConMas && (
                                <span className="absolute inset-0 bg-black/55 flex items-center justify-center text-white font-heading font-semibold text-lg">
                                    +{restantes}
                                </span>
                            )}
                        </button>
                    )
                })}

                <button
                    type="button"
                    onClick={() => onAbrir(0)}
                    className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-surface text-foreground text-sm font-semibold rounded-lg px-3 py-2 shadow-lg hover:bg-surface-hover transition-colors cursor-pointer"
                >
                    <Images className="w-4 h-4" aria-hidden="true" />
                    Ver galería
                </button>
            </div>
        </>
    )
}

export default GaleriaMosaico
