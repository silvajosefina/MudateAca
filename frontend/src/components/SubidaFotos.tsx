import { useRef } from 'react'
import { ImagePlus, X } from 'lucide-react'

interface SubidaFotosProps {
    fotos: string[]
    onChange: (fotos: string[]) => void
    minimo?: number
    error?: string
}

function leerComoDataUrl(archivo: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const lector = new FileReader()
        lector.onload = () => resolve(lector.result as string)
        lector.onerror = reject
        lector.readAsDataURL(archivo)
    })
}

function SubidaFotos({ fotos, onChange, minimo = 3, error }: SubidaFotosProps) {
    const inputRef = useRef<HTMLInputElement>(null)

    async function handleArchivos(archivos: FileList | null) {
        if (!archivos || archivos.length === 0) return
        const nuevas = await Promise.all(Array.from(archivos).map(leerComoDataUrl))
        onChange([...fotos, ...nuevas])
        if (inputRef.current) inputRef.current.value = ''
    }

    function handleQuitar(indice: number) {
        onChange(fotos.filter((_, i) => i !== indice))
    }

    return (
        <div>
            <div className="flex flex-wrap gap-3">
                {fotos.map((foto, indice) => (
                    <div key={indice} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border">
                        <img src={foto} alt={`Foto ${indice + 1}`} className="w-full h-full object-cover" />
                        <button
                            type="button"
                            onClick={() => handleQuitar(indice)}
                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-black/80 transition-colors"
                            aria-label={`Quitar foto ${indice + 1}`}
                        >
                            <X className="w-3 h-3" aria-hidden="true" />
                        </button>
                    </div>
                ))}

                <label
                    className={`w-24 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-xs text-muted cursor-pointer hover:border-primary hover:text-primary transition-colors ${error ? 'border-danger text-danger' : 'border-border'
                        }`}
                >
                    <ImagePlus className="w-5 h-5" aria-hidden="true" />
                    Agregar
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleArchivos(e.target.files)}
                    />
                </label>
            </div>

            <p className={`text-xs mt-2 ${error ? 'text-danger' : 'text-muted'}`}>
                {error ?? `Subí como mínimo ${minimo} fotografías (${fotos.length}/${minimo}).`}
            </p>
        </div>
    )
}

export default SubidaFotos
