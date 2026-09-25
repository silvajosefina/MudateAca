import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CarruselFotosProps {
    fotos: string[]
    descripcion: string
    claseAltura?: string
}

function CarruselFotos({ fotos, descripcion, claseAltura = 'aspect-video' }: CarruselFotosProps) {
    const [indiceFoto, setIndiceFoto] = useState(0)
    const totalFotos = fotos.length

    function fotoAnterior() {
        setIndiceFoto((prev) => (prev - 1 + totalFotos) % totalFotos)
    }

    function fotoSiguiente() {
        setIndiceFoto((prev) => (prev + 1) % totalFotos)
    }

    return (
        <div className={`relative w-full ${claseAltura} rounded-lg overflow-hidden bg-surface-hover`}>
            {totalFotos > 0 ? (
                <img
                    src={fotos[indiceFoto]}
                    alt={`Foto ${indiceFoto + 1} de ${descripcion}`}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-muted">
                    Sin fotografías
                </div>
            )}

            {totalFotos > 1 && (
                <>
                    <button
                        type="button"
                        onClick={fotoAnterior}
                        aria-label="Foto anterior"
                        className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/90 text-foreground shadow hover:bg-white transition-colors cursor-pointer"
                    >
                        <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        onClick={fotoSiguiente}
                        aria-label="Foto siguiente"
                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/90 text-foreground shadow hover:bg-white transition-colors cursor-pointer"
                    >
                        <ChevronRight className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 rounded-full bg-black/25 px-2 py-1.5">
                        {fotos.map((_, indice) => (
                            <button
                                key={indice}
                                type="button"
                                onClick={() => setIndiceFoto(indice)}
                                aria-label={`Ir a la foto ${indice + 1}`}
                                className={`w-2.5 h-2.5 rounded-full ring-1 ring-black/30 transition-colors cursor-pointer ${indice === indiceFoto ? 'bg-primary ring-white/70' : 'bg-white/90 hover:bg-white'
                                    }`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

export default CarruselFotos
