import { useState } from 'react'
import { Ban, Check, Download, FileSearch, FileText, X } from 'lucide-react'
import PanelLayout from '../layouts/PanelLayout'
import DialogoConMotivo from '../components/DialogoConMotivo'
import PublicacionPreviewModal from '../components/PublicacionPreviewModal'
import type { SolicitudConMotivo } from '../types/accionAdmin'
import {
    aprobarVerificacionPublicacion,
    obtenerTodasLasPublicaciones,
    ocultarPublicacion,
    rechazarVerificacionPublicacion,
    solicitarModificacionesPublicacion,
} from '../mocks/publicaciones'
import { obtenerUsuarioPorId } from '../mocks/usuarios'
import { mostrarToast } from '../mocks/toast'
import { formatearPrecio } from '../utils/formato'
import {
    ETIQUETAS_ESTADO_PUBLICACION,
    ETIQUETAS_TIPO_INMUEBLE,
    type EstadoPublicacion,
    type Publicacion,
    type TipoDocumentoVerificacionPublicacion,
} from '../types/publicacion'

const ETIQUETAS_DOCUMENTO: Record<TipoDocumentoVerificacionPublicacion, string> = {
    factura_servicio: 'Factura de un servicio asociada al domicilio',
    impuesto: 'Impuesto correspondiente al inmueble',
    documentacion_propiedad: 'Documentación de propiedad',
    matricula_corredor: 'Matrícula de corredor/a inmobiliario/a',
    constancia_inscripcion: 'Constancia de inscripción o CUIT de la inmobiliaria',
    poder_representacion: 'Poder o autorización de representación del propietario',
}

type FiltroPublicaciones = 'todas' | EstadoPublicacion

const PESTANAS_PUBLICACIONES: { valor: FiltroPublicaciones; etiqueta: string }[] = [
    { valor: 'todas', etiqueta: 'Todas' },
    { valor: 'pendiente_moderacion', etiqueta: 'En revisión' },
    { valor: 'activa', etiqueta: 'Activas' },
    { valor: 'pausada', etiqueta: 'Pausadas' },
    { valor: 'observada', etiqueta: 'Observadas' },
    { valor: 'rechazada', etiqueta: 'Rechazadas' },
    { valor: 'alquilada', etiqueta: 'Alquiladas' },
    { valor: 'archivada', etiqueta: 'Archivadas' },
    { valor: 'eliminada', etiqueta: 'Eliminadas' },
]

function esAccionable(publicacion: Publicacion): boolean {
    return publicacion.estado === 'pendiente_moderacion' || publicacion.estado === 'observada'
}

function AdminPublicaciones() {
    const [publicaciones, setPublicaciones] = useState<Publicacion[]>(() => obtenerTodasLasPublicaciones())
    const [filtro, setFiltro] = useState<FiltroPublicaciones>('todas')
    const [solicitud, setSolicitud] = useState<SolicitudConMotivo | null>(null)
    const [publicacionAVer, setPublicacionAVer] = useState<Publicacion | null>(null)

    function refrescar() {
        setPublicaciones(obtenerTodasLasPublicaciones())
    }

    const publicacionesFiltradas =
        filtro === 'todas' ? publicaciones : publicaciones.filter((p) => p.estado === filtro)

    function handleAprobar(publicacion: Publicacion) {
        aprobarVerificacionPublicacion(publicacion.id)
        mostrarToast('Publicación verificada y activada.')
        refrescar()
    }

    function confirmarSolicitud(motivo: string) {
        if (!solicitud) return
        if (solicitud.accion === 'rechazar_publicacion') {
            rechazarVerificacionPublicacion(solicitud.id, motivo)
            mostrarToast('Rechazo registrado.', 'error')
        } else if (solicitud.accion === 'solicitar_modificaciones') {
            solicitarModificacionesPublicacion(solicitud.id, motivo)
            mostrarToast('Se solicitaron modificaciones al propietario.')
        } else if (solicitud.accion === 'ocultar_publicacion') {
            ocultarPublicacion(solicitud.id, motivo)
            mostrarToast('Publicación ocultada.', 'error')
        }
        setSolicitud(null)
        refrescar()
    }

    return (
        <PanelLayout>
            <h1 className="flex items-center gap-2 text-lg sm:text-xl font-heading font-semibold text-foreground mb-1">
                <FileText className="w-5 h-5 text-primary" aria-hidden="true" />
                Publicaciones
            </h1>
            <p className="text-sm text-muted mb-6">
                Todas las publicaciones enviadas por propietarios e inmobiliarias. Las que están en
                revisión u observadas pueden aprobarse, rechazarse u ocultarse directamente desde acá.
            </p>

            <div className="bg-surface rounded-2xl shadow-card p-5">
                <div className="flex flex-wrap gap-2 mb-4">
                    {PESTANAS_PUBLICACIONES.map((pestana) => {
                        const cantidad =
                            pestana.valor === 'todas'
                                ? publicaciones.length
                                : publicaciones.filter((p) => p.estado === pestana.valor).length
                        return (
                            <button
                                key={pestana.valor}
                                type="button"
                                onClick={() => setFiltro(pestana.valor)}
                                className={`text-sm font-semibold rounded-full px-3 py-1.5 transition-colors cursor-pointer ${filtro === pestana.valor
                                    ? 'bg-primary text-surface'
                                    : 'bg-surface text-foreground border border-border hover:bg-primary-subtle'
                                    }`}
                            >
                                {pestana.etiqueta} <span className="opacity-80">{cantidad}</span>
                            </button>
                        )
                    })}
                </div>

                {publicacionesFiltradas.length === 0 ? (
                    <p className="text-sm text-muted">No hay publicaciones en este estado.</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {publicacionesFiltradas.map((publicacion) => {
                            const propietario = obtenerUsuarioPorId(publicacion.propietarioId)
                            const etiquetaEstado = ETIQUETAS_ESTADO_PUBLICACION[publicacion.estado]
                            const accionable = esAccionable(publicacion)
                            return (
                                <div
                                    key={publicacion.id}
                                    onClick={() => setPublicacionAVer(publicacion)}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-primary hover:bg-surface-hover transition-colors"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${etiquetaEstado.clase}`}>
                                                {etiquetaEstado.texto}
                                            </span>
                                            <span className="text-xs text-muted">{ETIQUETAS_TIPO_INMUEBLE[publicacion.tipoInmueble]}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-foreground truncate">
                                            {publicacion.descripcion}
                                        </p>
                                        <p className="text-xs text-muted">
                                            {propietario ? `${propietario.nombre} ${propietario.apellido}` : 'Propietario'} ·{' '}
                                            {publicacion.ubicacion} · {formatearPrecio(publicacion.precio)}
                                        </p>
                                        {accionable && (
                                            <p className="text-xs text-muted mt-1">
                                                {publicacion.tipoDocumentoVerificacion
                                                    ? ETIQUETAS_DOCUMENTO[publicacion.tipoDocumentoVerificacion]
                                                    : 'Sin tipo de documento'}
                                                {publicacion.nombreArchivoVerificacion && ` · ${publicacion.nombreArchivoVerificacion}`}
                                            </p>
                                        )}
                                        {publicacion.notaModeracion && (
                                            <p className="text-xs text-foreground bg-surface-hover rounded-lg px-2 py-1 mt-1">
                                                Nota: {publicacion.notaModeracion}
                                            </p>
                                        )}
                                        {publicacion.estado === 'rechazada' && publicacion.motivoRechazoVerificacion && (
                                            <p className="text-xs text-danger mt-1">
                                                Motivo del rechazo: {publicacion.motivoRechazoVerificacion}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 shrink-0 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                        {publicacion.urlArchivoVerificacion && (
                                            <a
                                                href={publicacion.urlArchivoVerificacion}
                                                download={publicacion.nombreArchivoVerificacion}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                                            >
                                                <Download className="w-4 h-4" aria-hidden="true" />
                                                Descargar
                                            </a>
                                        )}
                                        {accionable && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAprobar(publicacion)}
                                                    className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 bg-accent text-on-accent hover:opacity-90 transition-colors cursor-pointer"
                                                >
                                                    <Check className="w-4 h-4" aria-hidden="true" />
                                                    Aprobar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSolicitud({
                                                            accion: 'solicitar_modificaciones',
                                                            id: publicacion.id,
                                                            nombre: 'publicación',
                                                        })
                                                    }
                                                    className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                                                >
                                                    <FileSearch className="w-4 h-4" aria-hidden="true" />
                                                    Solicitar modificaciones
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSolicitud({
                                                            accion: 'ocultar_publicacion',
                                                            id: publicacion.id,
                                                            nombre: 'publicación',
                                                        })
                                                    }
                                                    className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                                                >
                                                    <Ban className="w-4 h-4" aria-hidden="true" />
                                                    Ocultar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSolicitud({
                                                            accion: 'rechazar_publicacion',
                                                            id: publicacion.id,
                                                            nombre: 'publicación',
                                                        })
                                                    }
                                                    className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 border border-danger text-danger hover:bg-danger hover:text-white transition-colors cursor-pointer"
                                                >
                                                    <X className="w-4 h-4" aria-hidden="true" />
                                                    Rechazar
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {solicitud && (
                <DialogoConMotivo solicitud={solicitud} onCancelar={() => setSolicitud(null)} onConfirmar={confirmarSolicitud} />
            )}

            {publicacionAVer && (
                <PublicacionPreviewModal
                    publicacion={publicacionAVer}
                    permitirEditar={false}
                    onClose={() => setPublicacionAVer(null)}
                />
            )}
        </PanelLayout>
    )
}

export default AdminPublicaciones
