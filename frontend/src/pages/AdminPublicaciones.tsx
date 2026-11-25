import { useState } from 'react'
import { FileText } from 'lucide-react'
import PanelLayout from '../layouts/PanelLayout'
import AccionesModeracion from '../components/AccionesModeracion'
import PublicacionPreviewModal from '../components/PublicacionPreviewModal'
import ModalDetalleUsuario from '../components/ModalDetalleUsuario'
import Paginacion from '../components/Paginacion'
import { listarPublicacionesAdministracion } from '../servicios/administracion'
import { mensajeDeError } from '../servicios/errores'
import { useConsulta } from '../hooks/useConsulta'
import { formatearPrecio, nombreDelAnunciante } from '../utils/formato'
import {
    ETIQUETAS_DOCUMENTO_VERIFICACION,
    ETIQUETAS_ESTADO_PUBLICACION,
    ETIQUETAS_TIPO_INMUEBLE,
    type EstadoPublicacion,
    type Publicacion,
} from '../types/publicacion'

type FiltroPublicaciones = 'todas' | EstadoPublicacion

const PESTANAS_PUBLICACIONES: { valor: FiltroPublicaciones; etiqueta: string }[] = [
    { valor: 'todas', etiqueta: 'Todas' },
    { valor: 'pendiente_moderacion', etiqueta: 'En revisión' },
    { valor: 'observada', etiqueta: 'Observadas' },
    { valor: 'activa', etiqueta: 'Activas' },
    { valor: 'pausada', etiqueta: 'Pausadas' },
    { valor: 'reservada', etiqueta: 'Reservadas' },
    { valor: 'rechazada', etiqueta: 'Rechazadas' },
    { valor: 'alquilada', etiqueta: 'Alquiladas' },
    { valor: 'archivada', etiqueta: 'Archivadas' },
    { valor: 'oculta', etiqueta: 'Ocultas' },
    { valor: 'eliminada', etiqueta: 'Eliminadas' },
]

const PUBLICACIONES_POR_PAGINA = 10

function AdminPublicaciones() {
    const [filtro, setFiltro] = useState<FiltroPublicaciones>('todas')
    const [paginaActual, setPaginaActual] = useState(1)
    const [publicacionAVer, setPublicacionAVer] = useState<Publicacion | null>(null)
    const [verPerfilPropietario, setVerPerfilPropietario] = useState(false)

    const estado = filtro === 'todas' ? null : filtro
    const consulta = useConsulta(`${estado}-${paginaActual}`, () => listarPublicacionesAdministracion(estado, paginaActual))
    const publicaciones = consulta.datos?.results ?? []
    const totales = consulta.datos?.totales ?? {}
    const totalPaginas = Math.max(1, Math.ceil((consulta.datos?.count ?? 0) / PUBLICACIONES_POR_PAGINA))

    function cantidadDe(valor: FiltroPublicaciones) {
        if (valor === 'todas') return Object.values(totales).reduce((suma, n) => suma + (n ?? 0), 0)
        return totales[valor] ?? 0
    }

    return (
        <PanelLayout>
            <h1 className="flex items-center gap-2 text-lg sm:text-xl font-heading font-semibold text-foreground mb-1">
                <FileText className="w-5 h-5 text-primary" aria-hidden="true" />
                Publicaciones
            </h1>
            <p className="text-sm text-muted mb-6">
                Todas las publicaciones de propietarios e inmobiliarias. Las que están en revisión u observadas
                pueden aprobarse, rechazarse o devolverse para modificar, y cualquier publicación visible puede
                ocultarse indicando el motivo.
            </p>

            <div className="bg-surface rounded-2xl shadow-card p-5">
                <div className="flex flex-wrap gap-2 mb-4">
                    {PESTANAS_PUBLICACIONES.map((pestana) => (
                        <button
                            key={pestana.valor}
                            type="button"
                            onClick={() => {
                                setFiltro(pestana.valor)
                                setPaginaActual(1)
                            }}
                            className={`text-sm font-semibold rounded-full px-3 py-1.5 transition-colors cursor-pointer ${filtro === pestana.valor
                                ? 'bg-primary text-surface'
                                : 'bg-surface text-foreground border border-border hover:bg-primary-subtle'
                                }`}
                        >
                            {pestana.etiqueta} <span className="opacity-80">{cantidadDe(pestana.valor)}</span>
                        </button>
                    ))}
                </div>

                {consulta.cargando && publicaciones.length === 0 ? (
                    <p className="text-sm text-muted">Cargando publicaciones…</p>
                ) : consulta.error ? (
                    <p className="text-sm text-danger">{mensajeDeError(consulta.error, 'No se pudieron cargar las publicaciones.')}</p>
                ) : publicaciones.length === 0 ? (
                    <p className="text-sm text-muted">No hay publicaciones en este estado.</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {publicaciones.map((publicacion) => {
                            const etiquetaEstado = ETIQUETAS_ESTADO_PUBLICACION[publicacion.estado]
                            const enRevision = publicacion.estado === 'pendiente_moderacion' || publicacion.estado === 'observada'
                            return (
                                <div
                                    key={publicacion.id}
                                    onClick={() => setPublicacionAVer(publicacion)}
                                    className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-primary hover:bg-surface-hover transition-colors"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${etiquetaEstado.clase}`}>
                                                {etiquetaEstado.texto}
                                            </span>
                                            <span className="text-xs text-muted">{ETIQUETAS_TIPO_INMUEBLE[publicacion.tipoInmueble]}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-foreground truncate">{publicacion.descripcion}</p>
                                        <p className="text-xs text-muted">
                                            {publicacion.anunciante ? nombreDelAnunciante(publicacion.anunciante) : 'Propietario'} ·{' '}
                                            {publicacion.ubicacion} · {formatearPrecio(publicacion.precio)}
                                        </p>
                                        {enRevision && publicacion.tipoDocumentoVerificacion && (
                                            <p className="text-xs text-muted mt-1">
                                                {ETIQUETAS_DOCUMENTO_VERIFICACION[publicacion.tipoDocumentoVerificacion]}
                                            </p>
                                        )}
                                        {publicacion.notaModeracion && (
                                            <p className="text-xs text-foreground bg-surface-hover rounded-lg px-2 py-1 mt-1">
                                                Nota: {publicacion.notaModeracion}
                                            </p>
                                        )}
                                        {publicacion.estado === 'rechazada' && publicacion.motivoRechazoVerificacion && (
                                            <p className="text-xs text-danger mt-1">Motivo del rechazo: {publicacion.motivoRechazoVerificacion}</p>
                                        )}
                                        {publicacion.estado === 'oculta' && publicacion.motivoOcultamiento && (
                                            <p className="text-xs text-danger mt-1">Motivo del ocultamiento: {publicacion.motivoOcultamiento}</p>
                                        )}
                                    </div>
                                    <AccionesModeracion publicacion={publicacion} onCambio={consulta.recargar} />
                                </div>
                            )
                        })}
                    </div>
                )}

                <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
            </div>

            {publicacionAVer && verPerfilPropietario && publicacionAVer.propietarioDetalle && (
                <ModalDetalleUsuario usuario={publicacionAVer.propietarioDetalle} onClose={() => setVerPerfilPropietario(false)} />
            )}
            {publicacionAVer && !verPerfilPropietario && (
                <PublicacionPreviewModal
                    publicacion={publicacionAVer}
                    permitirEditar={false}
                    propietario={publicacionAVer.propietarioDetalle}
                    onVerPropietario={() => setVerPerfilPropietario(true)}
                    onClose={() => setPublicacionAVer(null)}
                />
            )}
        </PanelLayout>
    )
}

export default AdminPublicaciones
