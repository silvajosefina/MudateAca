import { useState, type SubmitEvent } from 'react'
import { User } from 'lucide-react'
import PublicoLayout from '../layouts/PublicoLayout'
import PanelLayout from '../layouts/PanelLayout'
import { obtenerSesion, iniciarSesion } from '../servicios/sesion'
import { actualizarPerfil } from '../servicios/usuarios'
import { erroresDeCampos, mensajeDeError } from '../servicios/errores'
import { mostrarToast } from '../mocks/toast'

const CELULAR_REGEX = /^[0-9+\s-]{8,20}$/

interface Errores {
    nombre?: string
    apellido?: string
    celular?: string
    razonSocial?: string
    general?: string
}

function MiCuenta() {
    const sesion = obtenerSesion()
    const [nombre, setNombre] = useState(sesion?.nombre ?? '')
    const [apellido, setApellido] = useState(sesion?.apellido ?? '')
    const [celular, setCelular] = useState(sesion?.celular ?? '')
    const [razonSocial, setRazonSocial] = useState(sesion?.razonSocial ?? '')
    const [errores, setErrores] = useState<Errores>({})
    const [enviando, setEnviando] = useState(false)

    if (!sesion) return null

    const Layout = sesion.rol === 'interesado' ? PublicoLayout : PanelLayout
    const esInmobiliaria = sesion.rol === 'inmobiliaria'

    async function handleSubmit(e: SubmitEvent) {
        e.preventDefault()
        const nuevosErrores: Errores = {}

        if (!nombre.trim()) nuevosErrores.nombre = 'Ingresá tu nombre.'
        if (!apellido.trim()) nuevosErrores.apellido = 'Ingresá tu apellido.'

        if (!celular.trim()) {
            nuevosErrores.celular = 'Ingresá tu número de celular.'
        } else if (!CELULAR_REGEX.test(celular.trim())) {
            nuevosErrores.celular = 'Ingresá un número de celular válido.'
        }

        if (esInmobiliaria && !razonSocial.trim()) {
            nuevosErrores.razonSocial = 'Indicá la razón social de la inmobiliaria.'
        }

        setErrores(nuevosErrores)
        if (Object.keys(nuevosErrores).length > 0) return

        setEnviando(true)
        try {
            const usuario = await actualizarPerfil({
                nombre: nombre.trim(),
                apellido: apellido.trim(),
                celular: celular.trim(),
                razonSocial: esInmobiliaria ? razonSocial.trim() : undefined,
            })
            iniciarSesion(usuario)
            mostrarToast('Tus datos se actualizaron correctamente.')
        } catch (error) {
            const campos = erroresDeCampos(error)
            const errorDelServidor: Errores = {
                nombre: campos.nombre,
                apellido: campos.apellido,
                celular: campos.celular,
                razonSocial: campos.razon_social,
            }
            const hayErrorDeCampo = Object.values(errorDelServidor).some(Boolean)
            setErrores(hayErrorDeCampo ? errorDelServidor : { general: mensajeDeError(error) })
        } finally {
            setEnviando(false)
        }
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
                    <div className="w-full sm:w-1/2">
                        <label className="text-xs font-semibold text-muted">Correo electrónico</label>
                        <input
                            type="email"
                            value={sesion.correo}
                            disabled
                            className="w-full border border-border rounded-lg px-3 py-2 mt-1 bg-surface-hover text-muted cursor-not-allowed"
                        />
                        <p className="text-xs text-muted mt-1">El correo identifica tu cuenta y no se puede cambiar.</p>
                    </div>
                </div>

                {esInmobiliaria && (
                    <div>
                        <label className="text-xs font-semibold text-muted">Razón social</label>
                        <input
                            type="text"
                            value={razonSocial}
                            onChange={(e) => setRazonSocial(e.target.value)}
                            className={`w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-primary ${errores.razonSocial ? 'border-danger' : 'border-border'
                                }`}
                        />
                        {errores.razonSocial && <p className="text-xs text-danger mt-1">{errores.razonSocial}</p>}
                    </div>
                )}

                {errores.general && <p className="text-xs text-danger">{errores.general}</p>}

                <button
                    type="submit"
                    disabled={enviando}
                    className="bg-primary hover:bg-primary-hover text-surface font-heading font-semibold rounded-lg py-2 mt-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                >
                    Guardar cambios
                </button>
            </form>
        </Layout>
    )
}

export default MiCuenta
