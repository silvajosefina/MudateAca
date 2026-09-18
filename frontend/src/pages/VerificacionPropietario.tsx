import { useState, type ChangeEvent, type SubmitEvent } from 'react'
import { UploadCloud } from 'lucide-react'
import PanelLayout from '../layouts/PanelLayout'
import { actualizarUsuarioSesion, obtenerSesion } from '../mocks/sesion'
import type { EstadoVerificacion } from '../types/usuario'

type TipoDocumento =
    | 'factura_servicio'
    | 'impuesto'
    | 'documentacion_propiedad'
    | 'matricula_corredor'
    | 'constancia_inscripcion'
    | 'poder_representacion'

const EXTENSIONES_ADMITIDAS = ['application/pdf', 'image/jpeg', 'image/png']

const OPCIONES_DOCUMENTO: Record<'propietario' | 'inmobiliaria', { valor: TipoDocumento; etiqueta: string }[]> = {
    propietario: [
        { valor: 'factura_servicio', etiqueta: 'Factura de un servicio asociada al domicilio' },
        { valor: 'impuesto', etiqueta: 'Impuesto correspondiente al inmueble' },
        { valor: 'documentacion_propiedad', etiqueta: 'Documentación de propiedad' },
    ],
    inmobiliaria: [
        { valor: 'matricula_corredor', etiqueta: 'Matrícula de corredor/a inmobiliario/a' },
        { valor: 'constancia_inscripcion', etiqueta: 'Constancia de inscripción o CUIT de la inmobiliaria' },
        { valor: 'poder_representacion', etiqueta: 'Poder o autorización de representación del propietario' },
    ],
}

const ETIQUETAS_ESTADO: Record<EstadoVerificacion, { texto: string; clase: string }> = {
    pendiente: { texto: 'Pendiente de verificación', clase: 'bg-warning-subtle text-warning' },
    verificado: { texto: 'Verificado', clase: 'bg-primary-subtle text-primary' },
    rechazado: { texto: 'Rechazada', clase: 'bg-danger-subtle text-danger' },
}

function VerificacionPropietario() {
    const sesion = obtenerSesion()
    const esInmobiliaria = sesion?.rol === 'inmobiliaria'
    const opcionesDocumento = esInmobiliaria ? OPCIONES_DOCUMENTO.inmobiliaria : OPCIONES_DOCUMENTO.propietario
    const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>(opcionesDocumento[0].valor)
    const [archivo, setArchivo] = useState<File | null>(null)
    const [error, setError] = useState('')
    const [enviado, setEnviado] = useState(false)

    if (!sesion) return null

    const estadoActual = enviado ? 'pendiente' : sesion.estadoVerificacion
    const etiqueta = ETIQUETAS_ESTADO[estadoActual]

    function handleArchivo(e: ChangeEvent<HTMLInputElement>) {
        const seleccionado = e.target.files?.[0]
        if (!seleccionado) return

        if (!EXTENSIONES_ADMITIDAS.includes(seleccionado.type)) {
            setError('Formato no admitido. Subí un archivo PDF, JPG, JPEG o PNG.')
            setArchivo(null)
            return
        }

        setError('')
        setArchivo(seleccionado)
    }

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault()

        if (!archivo) {
            setError('Adjuntá un archivo con tu documentación.')
            return
        }

        actualizarUsuarioSesion({ estadoVerificacion: 'pendiente', motivoRechazo: undefined })
        setEnviado(true)
    }

    return (
        <PanelLayout>
            <div className="bg-surface rounded-2xl shadow-lg p-6 sm:p-8 max-w-xl mx-auto flex flex-col gap-5">
                <div>
                    <h2 className="text-lg sm:text-xl font-heading font-semibold text-foreground">
                        {esInmobiliaria ? 'Verificación de inmobiliaria' : 'Verificación de propietario'}
                    </h2>
                    <p className="text-sm text-muted mt-1">
                        {esInmobiliaria
                            ? 'Para poder publicar inmuebles necesitás acreditar la habilitación de tu inmobiliaria.'
                            : 'Para poder publicar inmuebles necesitás acreditar tu vinculación con la propiedad.'}
                    </p>
                </div>

                <span className={`inline-block w-fit text-xs font-semibold rounded-full px-3 py-1 ${etiqueta.clase}`}>
                    {etiqueta.texto}
                </span>

                {estadoActual === 'rechazado' && sesion.motivoRechazo && (
                    <p className="text-sm text-danger bg-danger-subtle border border-danger/20 rounded-lg px-3 py-2">
                        Motivo del rechazo: {sesion.motivoRechazo}
                    </p>
                )}

                {estadoActual === 'verificado' ? (
                    <p className="text-sm text-primary bg-primary-subtle border border-primary/20 rounded-lg px-3 py-2">
                        Tu cuenta ya fue verificada. Ya podés crear publicaciones.
                    </p>
                ) : enviado ? (
                    <p className="text-sm text-foreground bg-surface-hover border border-border rounded-lg px-3 py-2">
                        Tu documentación fue enviada y está en revisión. Te avisaremos por correo cuando el
                        proceso finalice.
                    </p>
                ) : (
                    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-1">
                                Tipo de documentación
                            </label>
                            <select
                                value={tipoDocumento}
                                onChange={(e) => setTipoDocumento(e.target.value as TipoDocumento)}
                                className="custom-select w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {opcionesDocumento.map((opcion) => (
                                    <option key={opcion.valor} value={opcion.valor}>
                                        {opcion.etiqueta}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-1">Archivo</label>
                            <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleArchivo}
                                className="block w-full text-sm text-foreground file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-primary-subtle file:text-primary file:font-semibold hover:file:bg-primary/20"
                            />
                            <p className="text-xs text-muted mt-1">Formatos admitidos: PDF, JPG, JPEG o PNG.</p>
                            {archivo && <p className="text-xs text-foreground mt-1">Seleccionado: {archivo.name}</p>}
                            {error && <p className="text-xs text-danger mt-1">{error}</p>}
                        </div>

                        <button
                            type="submit"
                            className="inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-white font-heading font-semibold rounded-lg py-2 transition-colors cursor-pointer"
                        >
                            <UploadCloud className="w-4 h-4" aria-hidden="true" />
                            Enviar documentación
                        </button>
                    </form>
                )}
            </div>
        </PanelLayout>
    )
}

export default VerificacionPropietario
