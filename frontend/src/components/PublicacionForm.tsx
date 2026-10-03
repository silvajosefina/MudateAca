import { useRef, useState, type ChangeEvent, type SubmitEvent } from 'react'
import { useNavigate } from 'react-router'
import { Save, Send, ShieldCheck, X } from 'lucide-react'
import SubidaFotos from './SubidaFotos'
import ConfirmDialog from './ConfirmDialog'
import Mapa from './Mapa'
import { actualizarPublicacion, crearPublicacion } from '../mocks/publicaciones'
import { obtenerSesion } from '../mocks/sesion'
import { mostrarToast } from '../mocks/toast'
import { formatearMiles, quitarFormatoMiles } from '../utils/formato'
import type {
    ModalidadAlquiler,
    Publicacion,
    PublicacionFormData,
    TipoDocumentoVerificacionPublicacion,
    TipoInmueble,
} from '../types/publicacion'

const LAT_DEFECTO = -35.9666
const LNG_DEFECTO = -62.7333
const EXTENSIONES_ADMITIDAS = ['application/pdf', 'image/jpeg', 'image/png']

const OPCIONES_DOCUMENTO_PROPIETARIO: { valor: TipoDocumentoVerificacionPublicacion; etiqueta: string }[] = [
    { valor: 'factura_servicio', etiqueta: 'Factura de un servicio asociada al domicilio' },
    { valor: 'impuesto', etiqueta: 'Impuesto correspondiente al inmueble' },
    { valor: 'documentacion_propiedad', etiqueta: 'Documentación de propiedad' },
]

const OPCIONES_DOCUMENTO_INMOBILIARIA: { valor: TipoDocumentoVerificacionPublicacion; etiqueta: string }[] = [
    { valor: 'matricula_corredor', etiqueta: 'Matrícula de corredor/a inmobiliario/a' },
    { valor: 'constancia_inscripcion', etiqueta: 'Constancia de inscripción o CUIT de la inmobiliaria' },
    { valor: 'poder_representacion', etiqueta: 'Poder o autorización de representación del propietario' },
]

interface PublicacionFormProps {
    modo: 'crear' | 'editar'
    publicacionExistente?: Publicacion
}

interface Errores {
    descripcion?: string
    precio?: string
    ubicacion?: string
    ambientes?: string
    dormitorios?: string
    disponibleDesde?: string
    disponibleHasta?: string
    duracionMinima?: string
    fotos?: string
    archivoVerificacion?: string
}

const MENSAJE_ANIO_INVALIDO = 'El año de la fecha no puede tener más de 4 dígitos.'
const OPCIONES_CANTIDAD = [1, 2, 3, 4, 5]

function anioExcedeCuatroDigitos(valorFecha: string): boolean {
    const [anio] = valorFecha.split('-')
    return anio.length > 4
}

function valorInicial(publicacion?: Publicacion): PublicacionFormData {
    return {
        tipoInmueble: publicacion?.tipoInmueble ?? 'departamento',
        modalidad: publicacion?.modalidad ?? 'residencial',
        descripcion: publicacion?.descripcion ?? '',
        precio: publicacion?.precio ?? 0,
        ubicacion: publicacion?.ubicacion ?? '',
        lat: publicacion?.lat ?? LAT_DEFECTO,
        lng: publicacion?.lng ?? LNG_DEFECTO,
        ambientes: publicacion?.ambientes ?? 1,
        dormitorios: publicacion?.dormitorios ?? 1,
        disponibleDesde: publicacion?.disponibleDesde ?? '',
        disponibleHasta: publicacion?.disponibleHasta ?? '',
        fotos: publicacion?.fotos ?? [],
        expensas: publicacion?.expensas,
        serviciosIncluidos: publicacion?.serviciosIncluidos ?? false,
        amueblado: publicacion?.amueblado ?? false,
        aceptaMascotas: publicacion?.aceptaMascotas ?? false,
        aptoEstudiantes: publicacion?.aptoEstudiantes ?? false,
        requisitos: publicacion?.requisitos ?? '',
        duracionMinima: publicacion?.duracionMinima ?? '',
        tipoDocumentoVerificacion: publicacion?.tipoDocumentoVerificacion,
        nombreArchivoVerificacion: publicacion?.nombreArchivoVerificacion,
    }
}

function PublicacionForm({ modo, publicacionExistente }: PublicacionFormProps) {
    const navigate = useNavigate()
    const sesion = obtenerSesion()
    const [datos, setDatos] = useState<PublicacionFormData>(valorInicial(publicacionExistente))
    const [errores, setErrores] = useState<Errores>({})
    const [mostrarConfirmCancelar, setMostrarConfirmCancelar] = useState(false)
    const valoresIniciales = useRef(valorInicial(publicacionExistente)).current

    if (!sesion) return null

    const esInmobiliaria = sesion.rol === 'inmobiliaria'
    const opcionesDocumento = esInmobiliaria ? OPCIONES_DOCUMENTO_INMOBILIARIA : OPCIONES_DOCUMENTO_PROPIETARIO
    const requiereDocumentacion =
        modo === 'crear' || publicacionExistente?.estado === 'pendiente_moderacion' || publicacionExistente?.estado === 'rechazada'

    function actualizarCampo<K extends keyof PublicacionFormData>(campo: K, valor: PublicacionFormData[K]) {
        setDatos((prev) => ({ ...prev, [campo]: valor }))
    }

    function handleArchivoVerificacion(e: ChangeEvent<HTMLInputElement>) {
        const seleccionado = e.target.files?.[0]
        if (!seleccionado) return

        if (!EXTENSIONES_ADMITIDAS.includes(seleccionado.type)) {
            setErrores((prev) => ({ ...prev, archivoVerificacion: 'Formato no admitido. Subí un archivo PDF, JPG, JPEG o PNG.' }))
            return
        }

        setErrores((prev) => {
            const siguiente = { ...prev }
            delete siguiente.archivoVerificacion
            return siguiente
        })
        actualizarCampo('nombreArchivoVerificacion', seleccionado.name)
    }

    function manejarCambioFecha(campo: 'disponibleDesde' | 'disponibleHasta', valor: string) {
        actualizarCampo(campo, valor)
        setErrores((prev) => {
            const siguiente = { ...prev }
            if (valor && anioExcedeCuatroDigitos(valor)) {
                siguiente[campo] = MENSAJE_ANIO_INVALIDO
            } else {
                delete siguiente[campo]
            }
            return siguiente
        })
    }

    function hayCambiosSinGuardar(): boolean {
        return JSON.stringify(datos) !== JSON.stringify(valoresIniciales)
    }

    function handleCancelar() {
        if (hayCambiosSinGuardar()) {
            setMostrarConfirmCancelar(true)
        } else {
            navigate('/mis-publicaciones')
        }
    }

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault()
        if (!sesion) return

        const nuevosErrores: Errores = {}

        if (!datos.descripcion.trim()) nuevosErrores.descripcion = 'Ingresá una descripción.'
        if (!datos.precio || datos.precio <= 0) nuevosErrores.precio = 'Ingresá un precio válido.'
        if (!datos.ubicacion.trim()) nuevosErrores.ubicacion = 'Ingresá la ubicación aproximada.'
        if (!datos.ambientes || datos.ambientes <= 0) nuevosErrores.ambientes = 'Ingresá la cantidad de ambientes.'
        if (datos.dormitorios < 0) nuevosErrores.dormitorios = 'Ingresá la cantidad de dormitorios.'
        if (!datos.disponibleDesde) nuevosErrores.disponibleDesde = 'Indicá la disponibilidad.'
        else if (anioExcedeCuatroDigitos(datos.disponibleDesde)) nuevosErrores.disponibleDesde = MENSAJE_ANIO_INVALIDO

        if (datos.disponibleHasta) {
            if (anioExcedeCuatroDigitos(datos.disponibleHasta)) {
                nuevosErrores.disponibleHasta = MENSAJE_ANIO_INVALIDO
            } else if (datos.disponibleDesde && datos.disponibleHasta < datos.disponibleDesde) {
                nuevosErrores.disponibleHasta = 'No puede ser anterior a la fecha "disponible desde".'
            }
        }

        if (datos.fotos.length < 3) nuevosErrores.fotos = `Subí como mínimo 3 fotografías (${datos.fotos.length}/3).`

        if (datos.modalidad === 'temporario' && !datos.duracionMinima?.trim()) {
            nuevosErrores.duracionMinima = 'Indicá la duración mínima de la estadía.'
        }

        if (requiereDocumentacion && !datos.nombreArchivoVerificacion) {
            nuevosErrores.archivoVerificacion = 'Adjuntá la documentación que acredite tu vínculo con la propiedad.'
        }

        setErrores(nuevosErrores)
        if (Object.keys(nuevosErrores).length > 0) return

        const datosAEnviar: PublicacionFormData = requiereDocumentacion
            ? { ...datos, tipoDocumentoVerificacion: datos.tipoDocumentoVerificacion ?? opcionesDocumento[0].valor }
            : datos

        if (modo === 'crear') {
            const creada = crearPublicacion(datosAEnviar, sesion.id)
            mostrarToast(
                creada.estado === 'pendiente_moderacion'
                    ? 'Publicación enviada. Tu documentación está en revisión.'
                    : 'Publicación creada correctamente.',
            )
        } else if (publicacionExistente) {
            const actualizada = actualizarPublicacion(publicacionExistente.id, datosAEnviar, sesion.id)
            mostrarToast(
                actualizada?.estado === 'pendiente_moderacion'
                    ? 'Cambios guardados. Tu documentación vuelve a estar en revisión.'
                    : 'Cambios guardados correctamente.',
            )
        }

        navigate('/mis-publicaciones')
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="bg-surface rounded-2xl shadow-lg p-6 sm:p-8 flex flex-col gap-5">
            <h2 className="text-lg sm:text-xl font-heading font-semibold text-foreground">
                {modo === 'crear' ? 'Nueva publicación' : 'Editar publicación'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">Tipo de inmueble</label>
                    <select
                        value={datos.tipoInmueble}
                        onChange={(e) => actualizarCampo('tipoInmueble', e.target.value as TipoInmueble)}
                        className="custom-select w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                        <option value="casa">Casa</option>
                        <option value="departamento">Departamento</option>
                        <option value="habitacion">Habitación</option>
                        <option value="residencia">Residencia</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">Modalidad de alquiler</label>
                    <select
                        value={datos.modalidad}
                        onChange={(e) => actualizarCampo('modalidad', e.target.value as ModalidadAlquiler)}
                        className="custom-select w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                        <option value="residencial">Residencial</option>
                        <option value="temporario">Temporario</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Descripción</label>
                <textarea
                    value={datos.descripcion}
                    onChange={(e) => actualizarCampo('descripcion', e.target.value)}
                    rows={4}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errores.descripcion ? 'border-danger' : 'border-border'
                        }`}
                />
                {errores.descripcion && <p className="text-xs text-danger mt-1">{errores.descripcion}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">Precio ($)</label>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={formatearMiles(datos.precio)}
                        onChange={(e) => actualizarCampo('precio', quitarFormatoMiles(e.target.value))}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errores.precio ? 'border-danger' : 'border-border'
                            }`}
                    />
                    {errores.precio && <p className="text-xs text-danger mt-1">{errores.precio}</p>}
                </div>

                <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">Ambientes</label>
                    <select
                        value={datos.ambientes}
                        onChange={(e) => actualizarCampo('ambientes', Number(e.target.value))}
                        className={`custom-select w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer ${errores.ambientes ? 'border-danger' : 'border-border'
                            }`}
                    >
                        {OPCIONES_CANTIDAD.map((cantidad) => (
                            <option key={cantidad} value={cantidad}>
                                {cantidad === 5 ? '5 o más' : cantidad}
                            </option>
                        ))}
                    </select>
                    {errores.ambientes && <p className="text-xs text-danger mt-1">{errores.ambientes}</p>}
                </div>

                <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">Dormitorios</label>
                    <select
                        value={datos.dormitorios}
                        onChange={(e) => actualizarCampo('dormitorios', Number(e.target.value))}
                        className={`custom-select w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer ${errores.dormitorios ? 'border-danger' : 'border-border'
                            }`}
                    >
                        <option value={0}>0 (monoambiente)</option>
                        {OPCIONES_CANTIDAD.map((cantidad) => (
                            <option key={cantidad} value={cantidad}>
                                {cantidad === 5 ? '5 o más' : cantidad}
                            </option>
                        ))}
                    </select>
                    {errores.dormitorios && <p className="text-xs text-danger mt-1">{errores.dormitorios}</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">Ubicación aproximada</label>
                    <input
                        type="text"
                        placeholder="Barrio, ciudad"
                        value={datos.ubicacion}
                        onChange={(e) => actualizarCampo('ubicacion', e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errores.ubicacion ? 'border-danger' : 'border-border'
                            }`}
                    />
                    {errores.ubicacion && <p className="text-xs text-danger mt-1">{errores.ubicacion}</p>}
                </div>

                <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">Disponible desde</label>
                    <input
                        type="date"
                        value={datos.disponibleDesde}
                        onChange={(e) => manejarCambioFecha('disponibleDesde', e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errores.disponibleDesde ? 'border-danger' : 'border-border'
                            }`}
                    />
                    {errores.disponibleDesde && <p className="text-xs text-danger mt-1">{errores.disponibleDesde}</p>}
                </div>

                <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">Disponible hasta (opcional)</label>
                    <input
                        type="date"
                        value={datos.disponibleHasta}
                        onChange={(e) => manejarCambioFecha('disponibleHasta', e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errores.disponibleHasta ? 'border-danger' : 'border-border'
                            }`}
                    />
                    {errores.disponibleHasta && <p className="text-xs text-danger mt-1">{errores.disponibleHasta}</p>}
                </div>
            </div>

            <div>
                <label className="block text-sm font-semibold text-foreground mb-1">
                    Ubicación en el mapa (opcional)
                </label>
                <p className="text-xs text-muted mb-2">
                    Hacé clic o arrastrá el marcador para ajustar la ubicación exacta.
                </p>
                <Mapa
                    lat={datos.lat ?? LAT_DEFECTO}
                    lng={datos.lng ?? LNG_DEFECTO}
                    onCambiarPosicion={(lat, lng) => setDatos((prev) => ({ ...prev, lat, lng }))}
                    alturaClase="h-80"
                />
            </div>

            {datos.modalidad === 'temporario' && (
                <div className="bg-surface-hover rounded-lg p-4">
                    <label className="block text-sm font-semibold text-foreground mb-1">Duración mínima</label>
                    <input
                        type="text"
                        placeholder="Ej: 7 noches"
                        value={datos.duracionMinima}
                        onChange={(e) => actualizarCampo('duracionMinima', e.target.value)}
                        className={`w-full sm:w-1/3 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errores.duracionMinima ? 'border-danger' : 'border-border'
                            }`}
                    />
                    {errores.duracionMinima && <p className="text-xs text-danger mt-1">{errores.duracionMinima}</p>}
                </div>
            )}

            <div>
                <label className="block text-sm font-semibold text-foreground mb-1">Expensas ($, opcional)</label>
                <input
                    type="text"
                    inputMode="numeric"
                    value={datos.expensas ? formatearMiles(datos.expensas) : ''}
                    onChange={(e) => {
                        const limpio = quitarFormatoMiles(e.target.value)
                        actualizarCampo('expensas', limpio || undefined)
                    }}
                    className="w-full sm:w-1/3 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                        type="checkbox"
                        checked={datos.serviciosIncluidos}
                        onChange={(e) => actualizarCampo('serviciosIncluidos', e.target.checked)}
                        className="w-4 h-4 accent-primary cursor-pointer"
                    />
                    Servicios incluidos
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                        type="checkbox"
                        checked={datos.amueblado}
                        onChange={(e) => actualizarCampo('amueblado', e.target.checked)}
                        className="w-4 h-4 accent-primary cursor-pointer"
                    />
                    Amueblado
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                        type="checkbox"
                        checked={datos.aceptaMascotas}
                        onChange={(e) => actualizarCampo('aceptaMascotas', e.target.checked)}
                        className="w-4 h-4 accent-primary cursor-pointer"
                    />
                    Acepta mascotas
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                        type="checkbox"
                        checked={datos.aptoEstudiantes}
                        onChange={(e) => actualizarCampo('aptoEstudiantes', e.target.checked)}
                        className="w-4 h-4 accent-primary cursor-pointer"
                    />
                    Apto estudiantes
                </label>
            </div>

            <div>
                <label className="block text-sm font-semibold text-foreground mb-1">
                    Requisitos solicitados (opcional)
                </label>
                <textarea
                    value={datos.requisitos}
                    onChange={(e) => actualizarCampo('requisitos', e.target.value)}
                    rows={2}
                    className="w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>

            <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Fotografías</label>
                <SubidaFotos
                    fotos={datos.fotos}
                    onChange={(fotos) => actualizarCampo('fotos', fotos)}
                    error={errores.fotos}
                />
            </div>

            {requiereDocumentacion && (
                <div className="bg-surface-hover rounded-lg p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                        <h3 className="text-sm font-heading font-semibold text-foreground">
                            Verificación de la publicación
                        </h3>
                    </div>
                    <p className="text-xs text-muted -mt-2">
                        {esInmobiliaria
                            ? 'Cada publicación de una inmobiliaria necesita documentación que acredite su habilitación para publicar este inmueble. Un administrador la revisará antes de que quede activa.'
                            : 'Cada publicación de un propietario particular necesita documentación que acredite su vínculo con la propiedad. Un administrador la revisará antes de que quede activa.'}
                    </p>

                    {publicacionExistente?.estado === 'rechazada' && publicacionExistente.motivoRechazoVerificacion && (
                        <p className="text-sm text-danger bg-danger-subtle border border-danger/20 rounded-lg px-3 py-2">
                            Motivo del rechazo anterior: {publicacionExistente.motivoRechazoVerificacion}
                        </p>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-1">
                            Tipo de documentación
                        </label>
                        <select
                            value={datos.tipoDocumentoVerificacion ?? opcionesDocumento[0].valor}
                            onChange={(e) =>
                                actualizarCampo(
                                    'tipoDocumentoVerificacion',
                                    e.target.value as TipoDocumentoVerificacionPublicacion,
                                )
                            }
                            className="custom-select w-full border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
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
                            onChange={handleArchivoVerificacion}
                            className="block w-full text-sm text-foreground file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-primary-subtle file:text-primary file:font-semibold hover:file:bg-primary/20"
                        />
                        <p className="text-xs text-muted mt-1">Formatos admitidos: PDF, JPG, JPEG o PNG.</p>
                        {datos.nombreArchivoVerificacion && (
                            <p className="text-xs text-foreground mt-1">
                                Seleccionado: {datos.nombreArchivoVerificacion}
                            </p>
                        )}
                        {errores.archivoVerificacion && (
                            <p className="text-xs text-danger mt-1">{errores.archivoVerificacion}</p>
                        )}
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-2">
                <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-foreground font-heading font-semibold rounded-lg py-2 px-6 transition-colors cursor-pointer"
                >
                    {modo === 'crear' ? (
                        <Send className="w-4 h-4" aria-hidden="true" />
                    ) : (
                        <Save className="w-4 h-4" aria-hidden="true" />
                    )}
                    {modo === 'crear' ? 'Publicar' : 'Guardar cambios'}
                </button>
                <button
                    type="button"
                    onClick={handleCancelar}
                    className="inline-flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-foreground hover:text-primary rounded-lg py-2 px-6 border border-border transition-colors cursor-pointer"
                >
                    <X className="w-4 h-4" aria-hidden="true" />
                    Cancelar
                </button>
            </div>

            {mostrarConfirmCancelar && (
                <ConfirmDialog
                    titulo="Descartar cambios"
                    mensaje="Ingresaste datos en el formulario. Si salís ahora, se van a perder."
                    textoConfirmar="Descartar y salir"
                    peligroso
                    colorConfirmar="primary"
                    onConfirmar={() => navigate('/mis-publicaciones')}
                    onCancelar={() => setMostrarConfirmCancelar(false)}
                />
            )}
        </form>
    )
}

export default PublicacionForm
