import { useEffect, useState, type SubmitEvent } from 'react'
import { useSearchParams } from 'react-router'
import { ChevronRight, Flag, MessageCircle, Send } from 'lucide-react'
import PublicoLayout from '../layouts/PublicoLayout'
import ModalReclamo from '../components/ModalReclamo'
import PublicacionPreviewModal from '../components/PublicacionPreviewModal'
import {
    obtenerConversacionesDeUsuario,
    obtenerMensajes,
    enviarMensaje,
    marcarConversacionComoLeida,
} from '../mocks/mensajes'
import { obtenerPublicacionPorId } from '../mocks/publicaciones'
import { obtenerSesion } from '../mocks/sesion'
import { obtenerUsuarioPorId } from '../mocks/usuarios'
import { formatearPrecio } from '../utils/formato'
import type { Conversacion } from '../types/mensaje'

const INTERVALO_POLLING_MS = 3000

function formatearHora(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function Mensajes() {
    const sesion = obtenerSesion()
    const [searchParams] = useSearchParams()
    const [conversaciones, setConversaciones] = useState<Conversacion[]>(() =>
        sesion ? obtenerConversacionesDeUsuario(sesion.id) : [],
    )
    const [conversacionId, setConversacionId] = useState<string | null>(searchParams.get('conversacion'))
    const [, setPollTick] = useState(0)
    const [texto, setTexto] = useState('')
    const [reclamoAbierto, setReclamoAbierto] = useState(false)
    const [publicacionModalAbierta, setPublicacionModalAbierta] = useState(false)

    const mensajes = conversacionId ? obtenerMensajes(conversacionId) : []
    const usuarioId = sesion?.id

    useEffect(() => {
        if (!conversacionId || !usuarioId) return
        marcarConversacionComoLeida(conversacionId, usuarioId)
        const intervalo = setInterval(() => {
            marcarConversacionComoLeida(conversacionId, usuarioId)
            setPollTick((t) => t + 1)
        }, INTERVALO_POLLING_MS)
        return () => clearInterval(intervalo)
    }, [conversacionId, usuarioId])

    if (!sesion) return null

    const conversacionActiva = conversaciones.find((c) => c.id === conversacionId) ?? null

    function handleEnviar(e: SubmitEvent) {
        e.preventDefault()
        if (!texto.trim() || !conversacionId) return
        enviarMensaje(conversacionId, sesion!.id, texto.trim())
        setPollTick((t) => t + 1)
        setConversaciones(obtenerConversacionesDeUsuario(sesion!.id))
        setTexto('')
    }

    function otraParte(conversacion: Conversacion) {
        const otroId = conversacion.interesadoId === sesion!.id ? conversacion.anuncianteId : conversacion.interesadoId
        return obtenerUsuarioPorId(otroId)
    }

    function tieneNoLeidos(conversacion: Conversacion) {
        return obtenerMensajes(conversacion.id).some((m) => !m.leido && m.autorId !== sesion!.id)
    }

    return (
        <PublicoLayout>
            <h1 className="flex items-center gap-2 text-lg sm:text-xl font-heading font-semibold text-foreground mb-6">
                <MessageCircle className="w-5 h-5 text-primary" aria-hidden="true" />
                Mensajes
            </h1>

            {conversaciones.length === 0 ? (
                <div className="bg-surface rounded-2xl shadow-lg p-8 text-center text-sm text-muted">
                    Todavía no tenés conversaciones. Contactá a un anunciante desde el detalle de una
                    publicación para empezar a chatear.
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row gap-4 h-[65vh] min-h-[420px]">
                    <div
                        className={`sm:w-72 shrink-0 bg-surface rounded-2xl shadow-lg overflow-y-auto ${conversacionActiva ? 'hidden sm:block' : 'block'
                            }`}
                    >
                        {conversaciones.map((conversacion) => {
                            const publicacion = obtenerPublicacionPorId(conversacion.publicacionId)
                            const contacto = otraParte(conversacion)
                            return (
                                <button
                                    key={conversacion.id}
                                    type="button"
                                    onClick={() => setConversacionId(conversacion.id)}
                                    className={`w-full text-left flex items-center gap-3 p-3 border-b border-border hover:bg-surface-hover transition-colors cursor-pointer ${conversacion.id === conversacionId ? 'bg-primary-subtle' : ''
                                        }`}
                                >
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-hover shrink-0">
                                        {publicacion?.fotos[0] && (
                                            <img
                                                src={publicacion.fotos[0]}
                                                alt={publicacion.descripcion}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-foreground truncate">
                                            {contacto ? `${contacto.nombre} ${contacto.apellido}` : 'Usuario'}
                                        </p>
                                        <p className="text-xs text-muted truncate">
                                            {publicacion ? formatearPrecio(publicacion.precio) : ''} · {publicacion?.ubicacion}
                                        </p>
                                    </div>
                                    {tieneNoLeidos(conversacion) && (
                                        <span
                                            className="w-2.5 h-2.5 rounded-full bg-primary shrink-0"
                                            aria-label="Mensajes sin leer"
                                        />
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    <div
                        className={`flex-1 bg-surface rounded-2xl shadow-lg flex-col ${conversacionActiva ? 'flex' : 'hidden sm:flex'
                            }`}
                    >
                        {!conversacionActiva ? (
                            <div className="flex-1 flex items-center justify-center text-sm text-muted p-8 text-center">
                                Seleccioná una conversación para ver los mensajes.
                            </div>
                        ) : (
                            <>
                                <div className="p-3 border-b border-border flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setConversacionId(null)}
                                        className="sm:hidden text-sm font-semibold text-muted hover:text-primary cursor-pointer shrink-0"
                                    >
                                        ←
                                    </button>
                                    <p className="text-sm font-semibold text-foreground shrink-0">
                                        {(() => {
                                            const contacto = otraParte(conversacionActiva)
                                            return contacto ? `${contacto.nombre} ${contacto.apellido}` : 'Usuario'
                                        })()}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setReclamoAbierto(true)}
                                        aria-label="Reportar usuario"
                                        title="Reportar usuario"
                                        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-muted hover:text-danger hover:bg-danger-subtle transition-colors cursor-pointer shrink-0"
                                    >
                                        <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                                    </button>
                                    {(() => {
                                        const publicacion = obtenerPublicacionPorId(conversacionActiva.publicacionId)
                                        if (!publicacion) return null
                                        return (
                                            <button
                                                type="button"
                                                onClick={() => setPublicacionModalAbierta(true)}
                                                className="flex items-center gap-2 min-w-0 flex-1 rounded-lg px-2 py-1 -my-1 hover:bg-surface-hover transition-colors cursor-pointer group"
                                                title="Ver detalles de la publicación"
                                            >
                                                <span className="text-muted">·</span>
                                                <div className="w-8 h-8 rounded-md overflow-hidden bg-surface-hover shrink-0">
                                                    {publicacion.fotos[0] && (
                                                        <img
                                                            src={publicacion.fotos[0]}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted truncate">
                                                    {formatearPrecio(publicacion.precio)} · {publicacion.descripcion.slice(0, 40)}
                                                    {publicacion.descripcion.length > 40 ? '…' : ''}
                                                </span>
                                                <ChevronRight
                                                    className="w-4 h-4 text-muted group-hover:text-primary transition-colors shrink-0 ml-auto"
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        )
                                    })()}
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                                    {mensajes.map((mensaje) => {
                                        const esPropio = mensaje.autorId === sesion.id
                                        return (
                                            <div
                                                key={mensaje.id}
                                                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${esPropio
                                                    ? 'self-end bg-primary text-surface'
                                                    : 'self-start bg-surface-hover text-foreground'
                                                    }`}
                                            >
                                                <p>{mensaje.texto}</p>
                                                <p className={`text-[10px] mt-1 ${esPropio ? 'text-surface/70' : 'text-muted'}`}>
                                                    {formatearHora(mensaje.enviadoEn)}
                                                </p>
                                            </div>
                                        )
                                    })}
                                </div>

                                <form onSubmit={handleEnviar} className="p-3 border-t border-border flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Escribí un mensaje..."
                                        value={texto}
                                        onChange={(e) => setTexto(e.target.value)}
                                        className="flex-1 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <button
                                        type="submit"
                                        aria-label="Enviar mensaje"
                                        className="inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-surface font-semibold rounded-lg px-4 py-2 transition-colors cursor-pointer"
                                    >
                                        <Send className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}

            {reclamoAbierto && conversacionActiva && (() => {
                const contacto = otraParte(conversacionActiva)
                if (!contacto) return null
                return (
                    <ModalReclamo
                        objetivoTipo="usuario"
                        objetivoId={contacto.id}
                        nombreObjetivo={`${contacto.nombre} ${contacto.apellido}`}
                        onClose={() => setReclamoAbierto(false)}
                    />
                )
            })()}

            {publicacionModalAbierta && conversacionActiva && (() => {
                const publicacion = obtenerPublicacionPorId(conversacionActiva.publicacionId)
                if (!publicacion) return null
                return (
                    <PublicacionPreviewModal
                        publicacion={publicacion}
                        permitirEditar={sesion.id === publicacion.propietarioId}
                        onClose={() => setPublicacionModalAbierta(false)}
                    />
                )
            })()}
        </PublicoLayout>
    )
}

export default Mensajes
