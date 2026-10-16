import { Link } from 'react-router'
import { ChevronRight, Download, Eye, FileText, Pencil, X } from 'lucide-react'
import CarruselFotos from './CarruselFotos'
import { formatearPrecio } from '../utils/formato'
import { ETIQUETAS_DOCUMENTO_VERIFICACION, ETIQUETAS_TIPO_INMUEBLE, type Publicacion } from '../types/publicacion'
import { ETIQUETAS_ROL, type Usuario } from '../types/usuario'

interface PublicacionPreviewModalProps {
    publicacion: Publicacion
    onClose: () => void
    permitirEditar?: boolean
    propietario?: Usuario
    onVerPropietario?: () => void
}

function PublicacionPreviewModal({
    publicacion,
    onClose,
    permitirEditar = true,
    propietario,
    onVerPropietario,
}: PublicacionPreviewModalProps) {
    const iniciales = propietario
        ? `${propietario.nombre.charAt(0)}${propietario.apellido.charAt(0)}`.toUpperCase()
        : ''
    return (
        <div
            className="fixed inset-0 z-[75] flex items-center justify-center bg-overlay/70 backdrop-blur-sm p-4"
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
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-4">
                    <CarruselFotos fotos={publicacion.fotos} descripcion={publicacion.descripcion} />

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-primary-subtle text-primary">
                            {ETIQUETAS_TIPO_INMUEBLE[publicacion.tipoInmueble]}
                        </span>
                        <span className="text-xs text-muted capitalize">{publicacion.modalidad}</span>
                    </div>

                    <p className="text-xl font-heading font-semibold text-foreground">
                        {formatearPrecio(publicacion.precio)}
                    </p>
                    <p className="text-sm text-muted whitespace-pre-line">{publicacion.descripcion}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm text-muted">
                        <p>{publicacion.ubicacion}</p>
                        <p>{publicacion.ambientes} ambiente(s)</p>
                        <p>{publicacion.dormitorios} dormitorio(s)</p>
                    </div>

                    {propietario && (
                        <button
                            type="button"
                            onClick={onVerPropietario}
                            className="w-full flex items-center gap-3 rounded-lg border border-border p-2.5 hover:border-primary hover:bg-primary-subtle transition-colors cursor-pointer text-left"
                        >
                            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary text-surface font-heading font-semibold text-sm shrink-0">
                                {iniciales}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground truncate">
                                    {propietario.nombre} {propietario.apellido}
                                </p>
                                <p className="text-xs text-muted truncate">{ETIQUETAS_ROL[propietario.rol]} · {propietario.correo}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
                        </button>
                    )}

                    {publicacion.urlArchivoVerificacion && (
                        <div className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary-subtle text-primary shrink-0">
                                <FileText className="w-4 h-4" aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground truncate">
                                    {publicacion.tipoDocumentoVerificacion
                                        ? ETIQUETAS_DOCUMENTO_VERIFICACION[publicacion.tipoDocumentoVerificacion]
                                        : 'Documentación adjunta'}
                                </p>
                                <p className="text-xs text-muted truncate">{publicacion.nombreArchivoVerificacion}</p>
                            </div>
                            <a
                                href={publicacion.urlArchivoVerificacion}
                                download={publicacion.nombreArchivoVerificacion}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Descargar documento"
                                title="Descargar documento"
                                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-muted hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer shrink-0"
                            >
                                <Download className="w-4 h-4" aria-hidden="true" />
                            </a>
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 px-5 pb-5">
                    <Link
                        to={`/explorar/${publicacion.id}`}
                        className="inline-flex items-center justify-center gap-1.5 border border-border text-foreground hover:border-primary hover:text-primary font-heading font-semibold rounded-lg py-2 px-6 transition-colors cursor-pointer"
                    >
                        <Eye className="w-4 h-4" aria-hidden="true" />
                        Ver publicación completa
                    </Link>
                    {permitirEditar && publicacion.estado !== 'alquilada' && publicacion.estado !== 'eliminada' && (
                        <Link
                            to={`/publicaciones/${publicacion.id}/editar`}
                            className="inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-surface font-heading font-semibold rounded-lg py-2 px-6 transition-colors cursor-pointer"
                        >
                            <Pencil className="w-4 h-4" aria-hidden="true" />
                            Editar
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}

export default PublicacionPreviewModal
