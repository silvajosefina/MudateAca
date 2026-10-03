import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'

interface SubidaFotosProps {
    fotos: string[]
    onChange: (fotos: string[]) => void
    minimo?: number
    error?: string
}

const TIPOS_ADMITIDOS = ['image/jpeg', 'image/jpg', 'image/webp', 'image/png']
const MENSAJE_FORMATO_INVALIDO = 'Formato no admitido. Subí fotos en JPG, JPEG, WEBP o PNG.'

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
    const [errorFormato, setErrorFormato] = useState('')

    async function handleArchivos(archivos: FileList | null) {
        if (!archivos || archivos.length === 0) return

        const seleccionados = Array.from(archivos)
        const validos = seleccionados.filter((archivo) => TIPOS_ADMITIDOS.includes(archivo.type))

        setErrorFormato(validos.length < seleccionados.length ? MENSAJE_FORMATO_INVALIDO : '')
        if (validos.length === 0) {
            if (inputRef.current) inputRef.current.value = ''
            return
        }

        const nuevas = await Promise.all(validos.map(leerComoDataUrl))
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
                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
                            aria-label={`Quitar foto ${indice + 1}`}
                        >
                            <X className="w-3 h-3" aria-hidden="true" />
                        </button>
                    </div>
                ))}

                <label
                    title="Formatos admitidos: JPG, JPEG, WEBP o PNG"
                    className={`w-24 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-xs text-muted cursor-pointer hover:border-primary hover:text-primary transition-colors ${error || errorFormato ? 'border-danger text-danger' : 'border-border'
                        }`}
                >
                    <ImagePlus className="w-5 h-5" aria-hidden="true" />
                    Agregar
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/jpeg,image/webp,image/png,.jpg,.jpeg,.webp,.png"
                        multiple
                        className="hidden"
                        onChange={(e) => handleArchivos(e.target.files)}
                    />
                </label>
            </div>

            <p className={`text-xs mt-2 ${error || errorFormato ? 'text-danger' : 'text-muted'}`}>
                {errorFormato || error || `Subí como mínimo ${minimo} fotografías (${fotos.length}/${minimo}). Formatos admitidos: JPG, JPEG, WEBP o PNG.`}
            </p>
        </div>
    )
}

export default SubidaFotos
