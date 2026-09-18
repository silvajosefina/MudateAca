import { useState, type SubmitEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import AuthLayout from '../layouts/AuthLayout'
import { MOCK_USUARIOS } from '../mocks/usuarios'
import { iniciarSesion } from '../mocks/sesion'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Errores {
    correo?: string
    contrasena?: string
    credencialesInvalidas?: boolean
}

function Login() {
    const navigate = useNavigate()
    const [correo, setCorreo] = useState('')
    const [contrasena, setContrasena] = useState('')
    const [errores, setErrores] = useState<Errores>({})
    const [rolSinPanel, setRolSinPanel] = useState(false)

    function handleSubmit(e: SubmitEvent) {
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

        const usuario = MOCK_USUARIOS.find((u) => u.correo === correo.toLowerCase())

        if (!nuevosErrores.correo && !nuevosErrores.contrasena) {
            if (!usuario || usuario.contrasena !== contrasena) {
                nuevosErrores.credencialesInvalidas = true
            }
        }

        setErrores(nuevosErrores)
        if (Object.keys(nuevosErrores).length > 0 || !usuario) return

        iniciarSesion(usuario)

        if (usuario.rol === 'propietario' || usuario.rol === 'inmobiliaria') {
            navigate('/mis-publicaciones')
        } else {
            setRolSinPanel(true)
        }
    }

    const correoConError = Boolean(errores.correo || errores.credencialesInvalidas)
    const contrasenaConError = Boolean(errores.contrasena || errores.credencialesInvalidas)

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
                    <input
                        type="password"
                        placeholder="Contraseña"
                        value={contrasena}
                        onChange={(e) => setContrasena(e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${contrasenaConError ? 'border-danger' : 'border-border'
                            }`}
                    />
                    {errores.contrasena && <p className="text-xs text-danger mt-1">{errores.contrasena}</p>}
                    {errores.credencialesInvalidas && (
                        <p className="text-xs text-danger mt-1">Usuario o contraseña incorrectos.</p>
                    )}
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
                    className="bg-primary hover:bg-primary-hover text-white font-heading font-semibold rounded-lg py-2 transition-colors cursor-pointer"
                >
                    Ingresar
                </button>

                <p className="text-sm text-center text-muted">
                    ¿No tenés cuenta?{' '}
                    <Link to="/registro" className="text-primary font-semibold">
                        Registrate
                    </Link>
                </p>
            </form>
        </AuthLayout>
    )
}

export default Login