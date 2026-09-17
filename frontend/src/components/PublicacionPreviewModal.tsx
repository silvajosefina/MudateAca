import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight, Pencil, X } from 'lucide-react'
import type { Publicacion } from '../types/publicacion'

interface PublicacionPreviewModalProps {
    publicacion: Publicacion
    onClose: () => void
}

function formatearPrecio(valor: number) {
    return valor.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
}

function PublicacionPreviewModal({ publicacion, onClose }: PublicacionPreviewModalProps) {
    const [indiceFoto, setIndiceFoto] = useState(0)
    const totalFotos = publicacion.fotos.length

    function fotoAnterior() {
        setIndiceFoto((prev) => (prev - 1 + totalFotos) % totalFotos)
    }

    function fotoSiguiente() {
        setIndiceFoto((prev) => (prev + 1) % totalFotos)
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/70 p-4"
            onClick={onClose}
        >
            <div
                className="bg-surface rounded-2xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 pt-5">
                    <h3 className="text-lg font-heading font-semibold text-foreground">Previsualización</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full text-foreground hover:bg-surface-hover transition-colors"
                    >
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-4">
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-surface-hover">
                        {totalFotos > 0 ? (
                            <img
                                src={publicacion.fotos[indiceFoto]}
                                alt={`Foto ${indiceFoto + 1} de ${publicacion.descripcion}`}
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
                                    className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/90 text-foreground shadow hover:bg-white transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    onClick={fotoSiguiente}
                                    aria-label="Foto siguiente"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/90 text-foreground shadow hover:bg-white transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5" aria-hidden="true" />
                                </button>
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                                    {publicacion.fotos.map((_, indice) => (
                                        <button
                                            key={indice}
                                            type="button"
                                            onClick={() => setIndiceFoto(indice)}
                                            aria-label={`Ir a la foto ${indice + 1}`}
                                            className={`w-2 h-2 rounded-full transition-colors ${indice === indiceFoto ? 'bg-primary' : 'bg-white/80'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-primary-subtle text-primary capitalize">
                            {publicacion.tipoInmueble}
                        </span>
                        <span className="text-xs text-muted capitalize">{publicacion.modalidad}</span>
                    </div>

                    <p className="text-xl font-heading font-semibold text-foreground">
                        {formatearPrecio(publicacion.precio)}
                    </p>
                    <p className="text-sm text-muted">{publicacion.descripcion}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm text-muted">
                        <p>{publicacion.ubicacion}</p>
                        <p>{publicacion.ambientes} ambiente(s)</p>
                        <p>{publicacion.dormitorios} dormitorio(s)</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 px-5 pb-5">
                    <Link
                        to={`/publicaciones/${publicacion.id}/editar`}
                        className="inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-white font-heading font-semibold rounded-lg py-2 px-6 transition-colors"
                    >
                        <Pencil className="w-4 h-4" aria-hidden="true" />
                        Editar
                    </Link>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg py-2 px-6 border border-border text-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                        <X className="w-4 h-4" aria-hidden="true" />
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    )
}

export default PublicacionPreviewModal
