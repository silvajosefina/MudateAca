import { useState } from 'react'
import { Check, Download, EyeOff, Eye, FileSearch, Clock, X } from 'lucide-react'
import DialogoConMotivo from './DialogoConMotivo'
import { moderarPublicacion, type AccionModeracion } from '../servicios/administracion'
import { mensajeDeError } from '../servicios/errores'
import { mostrarToast } from '../utils/toast'
import type { AccionConMotivo, SolicitudConMotivo } from '../types/accionAdmin'
import type { EstadoPublicacion, Publicacion } from '../types/publicacion'

// Mismos estados que valida el backend para cada acción (RF-19).
const EN_REVISION: EstadoPublicacion[] = ['pendiente_moderacion', 'observada']
const OCULTABLES: EstadoPublicacion[] = [
    'pendiente_moderacion', 'activa', 'pausada', 'observada', 'reservada', 'rechazada', 'alquilada',
]

const ACCION_DE_LA_SOLICITUD: Partial<Record<AccionConMotivo, AccionModeracion>> = {
    rechazar_publicacion: 'rechazar',
    solicitar_modificaciones: 'solicitar-modificaciones',
    mantener_observada: 'mantener-observada',
    ocultar_publicacion: 'ocultar',
}

const MENSAJES: Record<AccionModeracion, string> = {
    aprobar: 'Publicación verificada y activada.',
    mostrar: 'La publicación volvió a estar visible.',
    rechazar: 'Rechazo registrado.',
    'solicitar-modificaciones': 'Se solicitaron modificaciones al propietario.',
    'mantener-observada': 'La publicación sigue observada y se avisó al propietario.',
    ocultar: 'Publicación ocultada.',
}

const BOTON = 'inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait'
const BOTON_NEUTRO = `${BOTON} border border-border text-foreground hover:border-primary hover:text-primary`
const BOTON_PELIGRO = `${BOTON} border border-danger text-danger hover:bg-danger hover:text-white`

interface AccionesModeracionProps {
    publicacion: Publicacion
    onCambio: () => void
    // En el resumen del panel se muestran solo las acciones de revisión.
    soloRevision?: boolean
}

function AccionesModeracion({ publicacion, onCambio, soloRevision = false }: AccionesModeracionProps) {
    const [solicitud, setSolicitud] = useState<SolicitudConMotivo | null>(null)
    const [ocupada, setOcupada] = useState(false)
    const enRevision = EN_REVISION.includes(publicacion.estado)

    async function ejecutar(accion: AccionModeracion, nota?: string) {
        setOcupada(true)
        try {
            await moderarPublicacion(publicacion.id, accion, nota)
            mostrarToast(MENSAJES[accion], accion === 'rechazar' || accion === 'ocultar' ? 'error' : 'exito')
            onCambio()
        } catch (error) {
            mostrarToast(mensajeDeError(error), 'error')
        } finally {
            setOcupada(false)
        }
    }

    function pedirNota(accion: AccionConMotivo) {
        setSolicitud({ accion, id: publicacion.id, nombre: 'publicación' })
    }

    function confirmar(nota: string) {
        const accion = solicitud && ACCION_DE_LA_SOLICITUD[solicitud.accion]
        setSolicitud(null)
        if (accion) ejecutar(accion, nota)
    }

    return (
        <div className="flex gap-2 shrink-0 flex-wrap" onClick={(e) => e.stopPropagation()}>
            {!soloRevision && publicacion.urlArchivoVerificacion && (
                <a
                    href={publicacion.urlArchivoVerificacion}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={BOTON_NEUTRO}
                >
                    <Download className="w-4 h-4" aria-hidden="true" />
                    Documento
                </a>
            )}
            {enRevision && (
                <>
                    <button
                        type="button"
                        disabled={ocupada}
                        onClick={() => ejecutar('aprobar')}
                        className={`${BOTON} bg-accent text-on-accent hover:opacity-90`}
                    >
                        <Check className="w-4 h-4" aria-hidden="true" />
                        Aprobar
                    </button>
                    <button type="button" disabled={ocupada} onClick={() => pedirNota('solicitar_modificaciones')} className={BOTON_NEUTRO}>
                        <FileSearch className="w-4 h-4" aria-hidden="true" />
                        {soloRevision ? 'Solicitar modif.' : 'Solicitar modificaciones'}
                    </button>
                    {publicacion.estado === 'observada' && (
                        <button type="button" disabled={ocupada} onClick={() => pedirNota('mantener_observada')} className={BOTON_NEUTRO}>
                            <Clock className="w-4 h-4" aria-hidden="true" />
                            Mantener observada
                        </button>
                    )}
                    <button type="button" disabled={ocupada} onClick={() => pedirNota('rechazar_publicacion')} className={BOTON_PELIGRO}>
                        <X className="w-4 h-4" aria-hidden="true" />
                        Rechazar
                    </button>
                </>
            )}
            {!soloRevision && OCULTABLES.includes(publicacion.estado) && (
                <button type="button" disabled={ocupada} onClick={() => pedirNota('ocultar_publicacion')} className={BOTON_PELIGRO}>
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                    Ocultar
                </button>
            )}
            {!soloRevision && publicacion.estado === 'oculta' && (
                <button type="button" disabled={ocupada} onClick={() => ejecutar('mostrar')} className={BOTON_NEUTRO}>
                    <Eye className="w-4 h-4" aria-hidden="true" />
                    Volver a mostrar
                </button>
            )}

            {solicitud && (
                <DialogoConMotivo solicitud={solicitud} onCancelar={() => setSolicitud(null)} onConfirmar={confirmar} />
            )}
        </div>
    )
}

export default AccionesModeracion
