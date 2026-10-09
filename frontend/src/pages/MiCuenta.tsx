import { useState, type SubmitEvent } from 'react'
import { Flag, User } from 'lucide-react'
import PublicoLayout from '../layouts/PublicoLayout'
import PanelLayout from '../layouts/PanelLayout'
import { obtenerSesion, actualizarUsuarioSesion } from '../mocks/sesion'
import { actualizarUsuario, MOCK_USUARIOS, obtenerUsuarioPorId } from '../mocks/usuarios'
import { obtenerPublicacionPorId } from '../mocks/publicaciones'
import { obtenerReclamosPorUsuario } from '../mocks/reclamos'
import { mostrarToast } from '../mocks/toast'
import type { EstadoReclamo, MotivoReclamo, Reclamo } from '../types/reclamo'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USUARIO_REGEX = /^[a-zA-Z0-9._]{3,20}$/
const CELULAR_REGEX = /^[0-9+\s-]{8,20}$/

interface Errores {
    nombre?: string
    apellido?: string
    nombreUsuario?: string
    celular?: string
    correo?: string
}

const ETIQUETAS_MOTIVO_RECLAMO: Record<MotivoReclamo, string> = {
    enganosa: 'La publicación es engañosa',
    duplicada: 'Publicación duplicada',
    no_existe: 'La propiedad no existe',
    datos_falsos: 'Datos falsos',
    conducta_inapropiada: 'Conducta inapropiada',
    no_se_presento: 'No se presentó a una visita/encuentro acordado',
    posible_estafa: 'Posible estafa',
    otro: 'Otro motivo',
}

const ETIQUETAS_ESTADO_RECLAMO: Record<EstadoReclamo, { texto: string; clase: string }> = {
    pendiente: { texto: 'Pendiente', clase: 'bg-warning-subtle text-warning' },
    resuelto: { texto: 'Resuelto', clase: 'bg-accent-subtle text-accent' },
    descartado: { texto: 'Descartado', clase: 'bg-surface-hover text-muted' },
}

function nombreObjetivoReclamo(reclamo: Reclamo): string {
    if (reclamo.objetivoTipo === 'publicacion') {
        const publicacion = obtenerPublicacionPorId(reclamo.objetivoId)
        return publicacion ? publicacion.descripcion.slice(0, 50) : 'Publicación eliminada'
    }
    const usuario = obtenerUsuarioPorId(reclamo.objetivoId)
    return usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Usuario eliminado'
}

function MiCuenta() {
    const sesion = obtenerSesion()
    const [nombre, setNombre] = useState(sesion?.nombre ?? '')
    const [apellido, setApellido] = useState(sesion?.apellido ?? '')
    const [nombreUsuario, setNombreUsuario] = useState(sesion?.nombreUsuario ?? '')
    const [celular, setCelular] = useState(sesion?.celular ?? '')
    const [correo, setCorreo] = useState(sesion?.correo ?? '')
    const [errores, setErrores] = useState<Errores>({})

    if (!sesion) return null

    const Layout = sesion.rol === 'interesado' ? PublicoLayout : PanelLayout
    const misReclamos = obtenerReclamosPorUsuario(sesion.id)

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault()
        const nuevosErrores: Errores = {}

        if (!nombre.trim()) nuevosErrores.nombre = 'Ingresá tu nombre.'
        if (!apellido.trim()) nuevosErrores.apellido = 'Ingresá tu apellido.'

        if (!nombreUsuario.trim()) {
            nuevosErrores.nombreUsuario = 'Elegí un nombre de usuario.'
        } else if (!USUARIO_REGEX.test(nombreUsuario.trim())) {
            nuevosErrores.nombreUsuario = 'Usá entre 3 y 20 letras, números, puntos o guiones bajos.'
        } else if (
            MOCK_USUARIOS.some(
                (u) => u.id !== sesion!.id && u.nombreUsuario.toLowerCase() === nombreUsuario.trim().toLowerCase(),
            )
        ) {
            nuevosErrores.nombreUsuario = 'Ese nombre de usuario ya está en uso.'
        }

        if (!celular.trim()) {
            nuevosErrores.celular = 'Ingresá tu número de celular.'
        } else if (!CELULAR_REGEX.test(celular.trim())) {
            nuevosErrores.celular = 'Ingresá un número de celular válido.'
        }

        if (!correo.trim()) {
            nuevosErrores.correo = 'Ingresá tu correo electrónico.'
        } else if (!EMAIL_REGEX.test(correo)) {
            nuevosErrores.correo = 'Ingresá un correo electrónico válido.'
        } else if (MOCK_USUARIOS.some((u) => u.id !== sesion!.id && u.correo === correo.trim().toLowerCase())) {
            nuevosErrores.correo = 'Este correo ya está en uso por otra cuenta.'
        }

        setErrores(nuevosErrores)
        if (Object.keys(nuevosErrores).length > 0) return

        const cambios = {
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            nombreUsuario: nombreUsuario.trim(),
            celular: celular.trim(),
            correo: correo.trim().toLowerCase(),
        }
        actualizarUsuario(sesion!.id, cambios)
        actualizarUsuarioSesion(cambios)
        mostrarToast('Tus datos se actualizaron correctamente.')
    }

    return (
        <Layout>
            <h1 className="flex items-center gap-2 text-lg sm:text-xl font-heading font-semibold text-foreground mb-6">
                <User className="w-5 h-5 text-primary" aria-hidden="true" />
                Editar usuario
            </h1>

            <form
                onSubmit={handleSubmit}
                noValidate
                className="bg-surface rounded-2xl shadow-lg p-6 max-w-md flex flex-col gap-4"
            >
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-3">
                    <div className="w-full sm:w-1/2">
                        <label className="text-xs font-semibold text-muted">Nombre</label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className={`w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-primary ${errores.nombre ? 'border-danger' : 'border-border'
                                }`}
                        />
                        {errores.nombre && <p className="text-xs text-danger mt-1">{errores.nombre}</p>}
                    </div>
                    <div className="w-full sm:w-1/2">
                        <label className="text-xs font-semibold text-muted">Apellido</label>
                        <input
                            type="text"
                            value={apellido}
                            onChange={(e) => setApellido(e.target.value)}
                            className={`w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-primary ${errores.apellido ? 'border-danger' : 'border-border'
                                }`}
                        />
                        {errores.apellido && <p className="text-xs text-danger mt-1">{errores.apellido}</p>}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 sm:gap-3">
                    <div className="w-full sm:w-1/2">
                        <label className="text-xs font-semibold text-muted">Nombre de usuario</label>
                        <input
                            type="text"
                            value={nombreUsuario}
                            onChange={(e) => setNombreUsuario(e.target.value)}
                            className={`w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-primary ${errores.nombreUsuario ? 'border-danger' : 'border-border'
                                }`}
                        />
                        {errores.nombreUsuario && <p className="text-xs text-danger mt-1">{errores.nombreUsuario}</p>}
                    </div>
                    <div className="w-full sm:w-1/2">
                        <label className="text-xs font-semibold text-muted">Celular</label>
                        <input
                            type="tel"
                            value={celular}
                            onChange={(e) => setCelular(e.target.value)}
                            className={`w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-primary ${errores.celular ? 'border-danger' : 'border-border'
                                }`}
                        />
                        {errores.celular && <p className="text-xs text-danger mt-1">{errores.celular}</p>}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-semibold text-muted">Correo electrónico</label>
                    <input
                        type="email"
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-primary ${errores.correo ? 'border-danger' : 'border-border'
                            }`}
                    />
                    {errores.correo && <p className="text-xs text-danger mt-1">{errores.correo}</p>}
                </div>

                <button
                    type="submit"
                    className="bg-primary hover:bg-primary-hover text-surface font-heading font-semibold rounded-lg py-2 mt-2 transition-colors cursor-pointer"
                >
                    Guardar cambios
                </button>
            </form>

            <h2 className="flex items-center gap-2 text-lg sm:text-xl font-heading font-semibold text-foreground mt-8 mb-4">
                <Flag className="w-5 h-5 text-primary" aria-hidden="true" />
                Mis reclamos
            </h2>

            <div className="bg-surface rounded-2xl shadow-lg p-6 max-w-md">
                {misReclamos.length === 0 ? (
                    <p className="text-sm text-muted">No presentaste ningún reclamo todavía.</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {misReclamos.map((reclamo) => {
                            const etiquetaEstado = ETIQUETAS_ESTADO_RECLAMO[reclamo.estado]
                            return (
                                <div key={reclamo.id} className="rounded-lg border border-border p-3 flex flex-col gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${etiquetaEstado.clase}`}>
                                            {etiquetaEstado.texto}
                                        </span>
                                        <span className="text-xs text-muted">
                                            {reclamo.objetivoTipo === 'publicacion' ? 'Publicación' : 'Usuario'}
                                        </span>
                                    </div>
                                    <p className="text-sm font-semibold text-foreground">
                                        {ETIQUETAS_MOTIVO_RECLAMO[reclamo.motivo]} · {nombreObjetivoReclamo(reclamo)}
                                    </p>
                                    <p className="text-sm text-muted">{reclamo.descripcion}</p>
                                    {reclamo.notaAdmin && (
                                        <p className="text-xs text-foreground bg-surface-hover rounded-lg px-3 py-2">
                                            Respuesta de administración: {reclamo.notaAdmin}
                                        </p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </Layout>
    )
}

export default MiCuenta
