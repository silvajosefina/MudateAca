import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface ModalGaleriaProps {
    fotos: string[]
    descripcion: string
    indiceInicial: number
    onClose: () => void
}

function ModalGaleria({ fotos, descripcion, indiceInicial, onClose }: ModalGaleriaProps) {
    const [indice, setIndice] = useState(indiceInicial)
    const total = fotos.length

    function anterior() {
        setIndice((prev) => (prev - 1 + total) % total)
    }

    function siguiente() {
        setIndice((prev) => (prev + 1) % total)
    }

    useEffect(() => {
        function handleTeclado(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose()
            if (e.key === 'ArrowLeft') anterior()
            if (e.key === 'ArrowRight') siguiente()
        }
        document.addEventListener('keydown', handleTeclado)
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', handleTeclado)
            document.body.style.overflow = ''
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div
            className="fixed inset-0 z-[80] bg-black/95 flex flex-col"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={`Galería de fotos de ${descripcion}`}
        >
            <div className="flex items-center justify-between px-4 py-3 text-white shrink-0">
                <span className="text-sm font-semibold">
                    {indice + 1} / {total}
                </span>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Cerrar galería"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                >
                    <X className="w-5 h-5" aria-hidden="true" />
                </button>
            </div>

            <div className="relative flex-1 flex items-center justify-center min-h-0 px-4" onClick={(e) => e.stopPropagation()}>
                <img
                    src={fotos[indice]}
                    alt={`Foto ${indice + 1} de ${descripcion}`}
                    className="max-w-full max-h-full object-contain rounded-lg"
                />

                {total > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={anterior}
                            aria-label="Foto anterior"
                            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
                        >
                            <ChevronLeft className="w-6 h-6" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={siguiente}
                            aria-label="Foto siguiente"
                            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
                        >
                            <ChevronRight className="w-6 h-6" aria-hidden="true" />
                        </button>
                    </>
                )}
            </div>

            {total > 1 && (
                <div
                    className="flex gap-2 overflow-x-auto px-4 py-3 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                >
                    {fotos.map((foto, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setIndice(i)}
                            aria-label={`Ir a la foto ${i + 1}`}
                            aria-current={i === indice}
                            className={`shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 cursor-pointer transition-colors ${i === indice ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                                }`}
                        >
                            <img src={foto} alt="" className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default ModalGaleria
