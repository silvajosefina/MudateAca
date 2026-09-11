import { useState, type SubmitEvent } from 'react'
import { Link } from 'react-router'
import AuthLayout from '../layouts/AuthLayout'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

function Login() {
    const [correo, setCorreo] = useState('')
    const [contrasena, setContrasena] = useState('')
    const [error, setError] = useState('')

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault()

        if (!correo || !contrasena) {
            setError('Ingresá tu correo y tu contraseña.')
            return
        }

        if (!EMAIL_REGEX.test(correo)) {
            setError('Ingresá un correo electrónico válido.')
            return
        }

        if (!PASSWORD_REGEX.test(contrasena)) {
            setError('La contraseña debe tener al menos 8 caracteres, con una mayúscula, una minúscula y un número.')
            return
        }

        setError('')
        console.log({ correo, contrasena })
    }

    return (
        <AuthLayout title="Iniciar sesión">
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                {error && (
                    <p className="text-sm text-primary bg-primary-light rounded-lg px-3 py-2">{error}</p>
                )}

                <input
                    type="email"
                    placeholder="Correo electrónico"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />

                <input
                    type="password"
                    placeholder="Contraseña"
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />

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