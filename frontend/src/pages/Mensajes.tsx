import { useEffect, useRef, useState, type SubmitEvent } from 'react'
import { useSearchParams } from 'react-router'
import { Check, CheckCheck, ChevronRight, Flag, MessageCircle, Send } from 'lucide-react'
import PublicoLayout from '../layouts/PublicoLayout'
import ModalReclamo from '../components/ModalReclamo'
import PublicacionPreviewModal from '../components/PublicacionPreviewModal'
import {
    enviarMensaje,
    listarConversaciones,
    listarMensajes,
    marcarConversacionLeida,
    type Conversacion,
    type Mensaje,
} from '../servicios/mensajes'
import { obtenerPublicacion } from '../servicios/publicaciones'
import { mensajeDeError } from '../servicios/errores'
import { obtenerSesion } from '../servicios/sesion'
import { useConsulta } from '../hooks/useConsulta'
import { actualizarContadores } from '../hooks/useContador'
import { mostrarToast } from '../mocks/toast'
import { formatearPrecio, nombreDelAnunciante } from '../utils/formato'
import type { Publicacion } from '../types/publicacion'

// RF-15: el chat consulta los mensajes nuevos cada 3 segundos mientras está abierto.
const INTERVALO_POLLING_MS = 3000
// Cada tanto se relee la conversación completa para actualizar las marcas de "visto".
const POLLINGS_ENTRE_RELECTURAS = 5

function formatearHora(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function Mensajes() {
    const sesion = obtenerSesion()
    const [searchParams] = useSearchParams()
    const [conversacionId, setConversacionId] = useState<string | null>(searchParams.get('conversacion'))
    const [mensajes, setMensajes] = useState<Mensaje[]>([])
    const [texto, setTexto] = useState('')
    const [enviando, setEnviando] = useState(false)
    const [reclamoAbierto, setReclamoAbierto] = useState(false)
    const [publicacionModal, setPublicacionModal] = useState<Publicacion | null>(null)
    const finDelChatRef = useRef<HTMLDivElement>(null)

    const consultaConversaciones = useConsulta('conversaciones', listarConversaciones)
    const conversaciones = consultaConversaciones.datos ?? []
    const recargarConversaciones = consultaConversaciones.recargar

    // Polling del chat abierto: trae solo los mensajes nuevos y marca la conversación como leída.
    useEffect(() => {
        if (!conversacionId) return
        let vigente = true
        let ultimoId: string | undefined
        let pollings = 0

        async function consultar(completo: boolean) {
            try {
                const nuevos = await listarMensajes(conversacionId!, completo ? undefined : ultimoId)
                if (!vigente) return
                if (completo) {
                    setMensajes(nuevos)
                } else if (nuevos.length > 0) {
                    setMensajes((actuales) => [...actuales, ...nuevos.filter((m) => !actuales.some((a) => a.id === m.id))])
                }
                const ultimo = nuevos.at(-1)
                if (ultimo) ultimoId = ultimo.id
                if (completo || nuevos.length > 0) {
                    await marcarConversacionLeida(conversacionId!)
                    actualizarContadores()
                }
            } catch {
                // Si falla una consulta, el próximo polling lo vuelve a intentar.
            }
        }

        consultar(true)
        const intervalo = setInterval(() => {
            if (document.visibilityState !== 'visible') return
            pollings += 1
            consultar(pollings % POLLINGS_ENTRE_RELECTURAS === 0)
        }, INTERVALO_POLLING_MS)
        return () => {
            vigente = false
            clearInterval(intervalo)
        }
    }, [conversacionId])

    useEffect(() => {
        finDelChatRef.current?.scrollIntoView({ block: 'end' })
    }, [mensajes.length])

    if (!sesion) return null

    const conversacionActiva = conversaciones.find((c) => c.id === conversacionId) ?? null

    function seleccionar(id: string | null) {
        setMensajes([])
        setConversacionId(id)
    }

    async function handleEnviar(e: SubmitEvent) {
        e.preventDefault()
        if (!texto.trim() || !conversacionId || enviando) return
        setEnviando(true)
        try {
            const enviado = await enviarMensaje(conversacionId, texto.trim())
            setMensajes((actuales) => [...actuales, enviado])
            setTexto('')
            recargarConversaciones()
        } catch (error) {
            mostrarToast(mensajeDeError(error, 'No se pudo enviar el mensaje.'), 'error')
        } finally {
            setEnviando(false)
        }
    }

    async function abrirPublicacion(conversacion: Conversacion) {
        try {
            setPublicacionModal(await obtenerPublicacion(conversacion.publicacion.id))
        } catch {
            mostrarToast('La publicación ya no está disponible.', 'error')
        }
    }

    function otraParte(conversacion: Conversacion) {
        return conversacion.interesado.id === sesion!.id ? conversacion.anunciante : conversacion.interesado
    }

    return (
        <PublicoLayout>
            <h1 className="flex items-center gap-2 text-lg sm:text-xl font-heading font-semibold text-foreground mb-6">
                <MessageCircle className="w-5 h-5 text-primary" aria-hidden="true" />
                Mensajes
            </h1>

            {consultaConversaciones.cargando && conversaciones.length === 0 ? (
                <div className="bg-surface rounded-2xl shadow-lg p-8 text-center text-sm text-muted">
                    Cargando conversaciones…
                </div>
            ) : consultaConversaciones.error ? (
                <div className="bg-surface rounded-2xl shadow-lg p-8 text-center text-sm text-danger">
                    {mensajeDeError(consultaConversaciones.error, 'No se pudieron cargar tus conversaciones.')}
                </div>
            ) : conversaciones.length === 0 ? (
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
                            const contacto = otraParte(conversacion)
                            const { publicacion } = conversacion
                            return (
                                <button
                                    key={conversacion.id}
                                    type="button"
                                    onClick={() => seleccionar(conversacion.id)}
                                    className={`w-full text-left flex items-center gap-3 p-3 border-b border-border hover:bg-surface-hover transition-colors cursor-pointer ${conversacion.id === conversacionId ? 'bg-primary-subtle' : ''
                                        }`}
                                >
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-hover shrink-0">
                                        {publicacion.foto && (
                                            <img
                                                src={publicacion.foto}
                                                alt={publicacion.descripcion}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-foreground truncate">
                                            {nombreDelAnunciante(contacto)}
                                        </p>
                                        <p className="text-xs text-muted truncate">
                                            {formatearPrecio(publicacion.precio)} · {publicacion.ubicacion}
                                        </p>
                                    </div>
                                    {conversacion.noLeidos > 0 && conversacion.id !== conversacionId && (
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
                        className={`flex-1 bg-surface rounded-2xl shadow-lg flex-col min-w-0 ${conversacionActiva ? 'flex' : 'hidden sm:flex'
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
                                        onClick={() => seleccionar(null)}
                                        className="sm:hidden text-sm font-semibold text-muted hover:text-primary cursor-pointer shrink-0"
                                    >
                                        ←
                                    </button>
                                    <p className="text-sm font-semibold text-foreground shrink-0">
                                        {nombreDelAnunciante(otraParte(conversacionActiva))}
                                    </p>
                                    {sesion.rol !== 'administrador' && (
                                        <button
                                            type="button"
                                            onClick={() => setReclamoAbierto(true)}
                                            aria-label="Reportar usuario"
                                            title="Reportar usuario"
                                            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-muted hover:text-danger hover:bg-danger-subtle transition-colors cursor-pointer shrink-0"
                                        >
                                            <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => abrirPublicacion(conversacionActiva)}
                                        className="flex items-center gap-2 min-w-0 flex-1 rounded-lg px-2 py-1 -my-1 hover:bg-surface-hover transition-colors cursor-pointer group"
                                        title="Ver detalles de la publicación"
                                    >
                                        <span className="text-muted">·</span>
                                        <div className="w-8 h-8 rounded-md overflow-hidden bg-surface-hover shrink-0">
                                            {conversacionActiva.publicacion.foto && (
                                                <img
                                                    src={conversacionActiva.publicacion.foto}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                        </div>
                                        <span className="text-xs text-muted truncate">
                                            {formatearPrecio(conversacionActiva.publicacion.precio)} ·{' '}
                                            {conversacionActiva.publicacion.descripcion.slice(0, 40)}
                                            {conversacionActiva.publicacion.descripcion.length > 40 ? '…' : ''}
                                        </span>
                                        <ChevronRight
                                            className="w-4 h-4 text-muted group-hover:text-primary transition-colors shrink-0 ml-auto"
                                            aria-hidden="true"
                                        />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                                    {mensajes.length === 0 && (
                                        <p className="text-sm text-muted text-center my-auto">
                                            Todavía no hay mensajes. Escribí el primero.
                                        </p>
                                    )}
                                    {mensajes.map((mensaje) => {
                                        const esPropio = mensaje.autorId === sesion.id
                                        return (
                                            <div
                                                key={mensaje.id}
                                                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm break-words ${esPropio
                                                    ? 'self-end bg-primary text-surface'
                                                    : 'self-start bg-surface-hover text-foreground'
                                                    }`}
                                            >
                                                <p className="whitespace-pre-line">{mensaje.texto}</p>
                                                <p className={`flex items-center gap-1 text-[10px] mt-1 ${esPropio ? 'text-surface/70' : 'text-muted'}`}>
                                                    {formatearHora(mensaje.enviadoEn)}
                                                    {esPropio && (
                                                        mensaje.leido ? (
                                                            <CheckCheck className="w-3.5 h-3.5 text-accent" aria-label="Visto" />
                                                        ) : (
                                                            <Check className="w-3.5 h-3.5" aria-label="Enviado" />
                                                        )
                                                    )}
                                                </p>
                                            </div>
                                        )
                                    })}
                                    <div ref={finDelChatRef} />
                                </div>

                                <form onSubmit={handleEnviar} className="p-3 border-t border-border flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Escribí un mensaje..."
                                        value={texto}
                                        maxLength={2000}
                                        onChange={(e) => setTexto(e.target.value)}
                                        className="flex-1 min-w-0 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <button
                                        type="submit"
                                        disabled={enviando}
                                        aria-label="Enviar mensaje"
                                        className="inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-surface font-semibold rounded-lg px-4 py-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
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
                return (
                    <ModalReclamo
                        objetivoTipo="usuario"
                        objetivoId={contacto.id}
                        nombreObjetivo={nombreDelAnunciante(contacto)}
                        onClose={() => setReclamoAbierto(false)}
                    />
                )
            })()}

            {publicacionModal && (
                <PublicacionPreviewModal
                    publicacion={publicacionModal}
                    permitirEditar={sesion.id === publicacionModal.propietarioId}
                    onClose={() => setPublicacionModal(null)}
                />
            )}
        </PublicoLayout>
    )
}

export default Mensajes
