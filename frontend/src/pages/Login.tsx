import { useState, type SubmitEvent } from 'react'
import { Link } from 'react-router'
import AuthLayout from '../layouts/AuthLayout'
import { MOCK_USUARIOS } from '../mocks/usuarios'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Errores {
    correo?: string
    contrasena?: string
    credencialesInvalidas?: boolean
}

function Login() {
    const [correo, setCorreo] = useState('')
    const [contrasena, setContrasena] = useState('')
    const [errores, setErrores] = useState<Errores>({})

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

        if (!nuevosErrores.correo && !nuevosErrores.contrasena) {
            const usuario = MOCK_USUARIOS.find((u) => u.correo === correo.toLowerCase())
            if (!usuario || usuario.contrasena !== contrasena) {
                nuevosErrores.credencialesInvalidas = true
            }
        }

        setErrores(nuevosErrores)
        if (Object.keys(nuevosErrores).length > 0) return

        // Acá más adelante se conecta con el backend (RF-02)
        console.log({ correo, contrasena })
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
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${correoConError ? 'border-primary' : 'border-gray-300'
                            }`}
                    />
                    {errores.correo && <p className="text-xs text-primary mt-1">{errores.correo}</p>}
                </div>

                <div>
                    <input
                        type="password"
                        placeholder="Contraseña"
                        value={contrasena}
                        onChange={(e) => setContrasena(e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${contrasenaConError ? 'border-primary' : 'border-gray-300'
                            }`}
                    />
                    {errores.contrasena && <p className="text-xs text-primary mt-1">{errores.contrasena}</p>}
                    {errores.credencialesInvalidas && (
                        <p className="text-xs text-primary mt-1">Usuario o contraseña incorrectos.</p>
                    )}
                </div>

                <p className="text-right text-sm">
                    <Link to="/recuperar-contrasena" className="text-primary">
                        ¿Olvidaste tu contraseña?
                    </Link>
                </p>

                <button
                    type="submit"
                    className="bg-primary hover:bg-primary-dark text-white font-heading font-semibold rounded-lg py-2 transition-colors"
                >
                    Ingresar
                </button>

                <p className="text-sm text-center text-gray-500">
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