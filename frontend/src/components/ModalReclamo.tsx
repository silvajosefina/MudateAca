import { useState } from 'react'
import { Flag, X } from 'lucide-react'
import { crearReclamo } from '../servicios/reclamos'
import { mensajeDeError } from '../servicios/errores'
import { obtenerSesion } from '../servicios/sesion'
import { mostrarToast } from '../mocks/toast'
import type { MotivoReclamo, TipoObjetivoReclamo } from '../types/reclamo'

interface ModalReclamoProps {
    objetivoTipo: TipoObjetivoReclamo
    objetivoId: string
    nombreObjetivo: string
    onClose: () => void
}

const MOTIVOS_PUBLICACION: { valor: MotivoReclamo; etiqueta: string }[] = [
    { valor: 'enganosa', etiqueta: 'La publicación es engañosa' },
    { valor: 'duplicada', etiqueta: 'Es una publicación duplicada' },
    { valor: 'no_existe', etiqueta: 'La propiedad no existe' },
    { valor: 'datos_falsos', etiqueta: 'Tiene datos falsos' },
    { valor: 'otro', etiqueta: 'Otro motivo' },
]

const MOTIVOS_USUARIO: { valor: MotivoReclamo; etiqueta: string }[] = [
    { valor: 'conducta_inapropiada', etiqueta: 'Conducta inapropiada' },
    { valor: 'no_se_presento', etiqueta: 'No se presentó a una visita/encuentro acordado' },
    { valor: 'posible_estafa', etiqueta: 'Posible estafa' },
    { valor: 'otro', etiqueta: 'Otro motivo' },
]

function ModalReclamo({ objetivoTipo, objetivoId, nombreObjetivo, onClose }: ModalReclamoProps) {
    const sesion = obtenerSesion()
    const opciones = objetivoTipo === 'publicacion' ? MOTIVOS_PUBLICACION : MOTIVOS_USUARIO
    const [motivo, setMotivo] = useState<MotivoReclamo>(opciones[0].valor)
    const [descripcion, setDescripcion] = useState('')
    const [error, setError] = useState('')
    const [enviando, setEnviando] = useState(false)
    // El backend controla si ya hay un reclamo abierto sobre lo mismo (RF-16).
    const [yaTieneReclamoPendiente, setYaTieneReclamoPendiente] = useState(false)

    if (!sesion) return null

    async function handleEnviar() {
        if (!descripcion.trim()) {
            setError('Contanos un poco más para que podamos revisarlo.')
            return
        }
        setEnviando(true)
        try {
            await crearReclamo({ objetivoTipo, objetivoId, motivo, descripcion: descripcion.trim() })
            mostrarToast('Gracias, recibimos tu reclamo y lo vamos a revisar.')
            onClose()
        } catch (err) {
            const mensaje = mensajeDeError(err, 'No se pudo enviar el reclamo.')
            if (mensaje.startsWith('Ya tenés un reclamo pendiente')) {
                setYaTieneReclamoPendiente(true)
            } else {
                mostrarToast(mensaje, 'error')
            }
        } finally {
            setEnviando(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-overlay/70 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="bg-surface rounded-2xl shadow-card w-full max-w-md p-6 flex flex-col gap-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Flag className="w-5 h-5 shrink-0 text-danger" aria-hidden="true" />
                        <h3 className="text-base font-heading font-semibold text-foreground">
                            {objetivoTipo === 'publicacion' ? 'Reportar publicación' : 'Reportar usuario'}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-foreground hover:bg-surface-hover transition-colors cursor-pointer shrink-0"
                    >
                        <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>

                {yaTieneReclamoPendiente ? (
                    <>
                        <p className="text-sm text-muted">
                            Ya tenés un reclamo pendiente sobre{' '}
                            {objetivoTipo === 'publicacion' ? 'esta publicación' : 'este usuario'}. Esperá a que un
                            administrador lo revise antes de enviar uno nuevo.
                        </p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg py-2 px-6 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer self-start"
                        >
                            Entendido
                        </button>
                    </>
                ) : (
                    <>
                        <p className="text-sm text-muted">
                            Estás reportando {objetivoTipo === 'publicacion' ? 'la publicación' : 'a'}{' '}
                            <span className="font-semibold text-foreground">{nombreObjetivo}</span>. Un administrador va a
                            revisar tu reclamo.
                        </p>

                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-1">Motivo</label>
                            <select
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value as MotivoReclamo)}
                                className="custom-select w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                            >
                                {opciones.map((opcion) => (
                                    <option key={opcion.valor} value={opcion.valor}>
                                        {opcion.etiqueta}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-1">Contanos qué pasó</label>
                            <textarea
                                value={descripcion}
                                onChange={(e) => {
                                    setDescripcion(e.target.value)
                                    if (error) setError('')
                                }}
                                rows={4}
                                placeholder="Describí la situación con el mayor detalle posible."
                                className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${error ? 'border-danger' : 'border-border'
                                    }`}
                            />
                            {error && <p className="text-xs text-danger mt-1">{error}</p>}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 mt-1">
                            <button
                                type="button"
                                onClick={handleEnviar}
                                disabled={enviando}
                                className="inline-flex items-center justify-center gap-1.5 bg-danger text-white hover:opacity-90 font-heading font-semibold rounded-lg py-2 px-6 transition-colors cursor-pointer"
                            >
                                <Flag className="w-4 h-4" aria-hidden="true" />
                                Enviar reclamo
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg py-2 px-6 border border-border text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default ModalReclamo
