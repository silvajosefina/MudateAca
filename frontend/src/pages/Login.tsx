import { useState, type SubmitEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import AuthLayout from '../layouts/AuthLayout'
import InputContrasena from '../components/InputContrasena'
import { isAxiosError } from 'axios'
import { iniciarSesion } from '../servicios/sesion'
import { ingresar } from '../servicios/usuarios'
import { mensajeDeError } from '../servicios/errores'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Errores {
    correo?: string
    contrasena?: string
    credencialesInvalidas?: boolean
    general?: string
}

function Login() {
    const navigate = useNavigate()
    const [correo, setCorreo] = useState('')
    const [contrasena, setContrasena] = useState('')
    const [errores, setErrores] = useState<Errores>({})
    const [rolSinPanel, setRolSinPanel] = useState(false)
    const [enviando, setEnviando] = useState(false)

    async function handleSubmit(e: SubmitEvent) {
        e.preventDefault()
        const nuevosErrores: Errores = {}

        if (!correo) {
            nuevosErrores.correo = 'Ingresá tu correo electrónico.'
        } else if (!EMAIL_REGEX.test(correo)) {
            nuevosErrores.correo = 'Ingresá un correo electrónico válido.'
        }

        if (!contrasena) {
            nuevosErrores.contrasena = 'Ingresá tu contraseña.'
        }

        setErrores(nuevosErrores)
        if (Object.keys(nuevosErrores).length > 0) return

        setEnviando(true)
        try {
            const usuario = await ingresar(correo.trim(), contrasena)
            iniciarSesion(usuario)

            if (usuario.rol === 'propietario' || usuario.rol === 'inmobiliaria') {
                navigate('/mis-publicaciones')
            } else if (usuario.rol === 'interesado') {
                navigate('/explorar')
            } else if (usuario.rol === 'administrador') {
                navigate('/panel-administracion')
            } else {
                setRolSinPanel(true)
            }
        } catch (error) {
            // 401: correo o contraseña incorrectos. Otros casos (cuenta suspendida, demasiados
            // intentos, servidor caído) llegan con su propio mensaje.
            if (isAxiosError(error) && error.response?.status === 401) {
                setErrores({ credencialesInvalidas: true })
            } else {
                setErrores({ general: mensajeDeError(error) })
            }
        } finally {
            setEnviando(false)
        }
    }

    const correoConError = Boolean(errores.correo || errores.credencialesInvalidas || errores.general)
    const contrasenaConError = Boolean(errores.contrasena || errores.credencialesInvalidas || errores.general)

    return (
        <AuthLayout title="Iniciar sesión">
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                <div>
                    <input
                        type="email"
                        placeholder="Correo electrónico"
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${correoConError ? 'border-danger' : 'border-border'
                            }`}
                    />
                    {errores.correo && <p className="text-xs text-danger mt-1">{errores.correo}</p>}
                </div>

                <div>
                    <InputContrasena
                        value={contrasena}
                        onChange={setContrasena}
                        autoComplete="current-password"
                        conError={contrasenaConError}
                    />
                    {errores.contrasena && <p className="text-xs text-danger mt-1">{errores.contrasena}</p>}
                    {errores.credencialesInvalidas && (
                        <p className="text-xs text-danger mt-1">Usuario o contraseña incorrectos.</p>
                    )}
                    {errores.general && <p className="text-xs text-danger mt-1">{errores.general}</p>}
                </div>

                {rolSinPanel && (
                    <p className="text-xs text-foreground bg-surface-hover border border-border rounded-lg px-3 py-2">
                        Iniciaste sesión correctamente. El panel para tu tipo de cuenta todavía no está
                        disponible en esta versión.
                    </p>
                )}

                <p className="text-right text-sm">
                    <Link to="/recuperar-contrasena" className="text-primary">
                        ¿Olvidaste tu contraseña?
                    </Link>
                </p>

                <button
                    type="submit"
                    disabled={enviando}
                    className="bg-primary hover:bg-primary-hover text-surface font-heading font-semibold rounded-lg py-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                >
                    Ingresar
                </button>

                <p className="text-sm text-center text-muted">
                    ¿No tenés cuenta?{' '}
                    <Link to="/registro" className="text-primary font-semibold">
                        Registrate
                    </Link>
                </p>

                <p className="text-sm text-center text-muted">
                    <Link to="/explorar" className="text-primary font-semibold">
                        Explorar publicaciones sin registrarte
                    </Link>
                </p>
            </form>
        </AuthLayout>
    )
}

export default Login