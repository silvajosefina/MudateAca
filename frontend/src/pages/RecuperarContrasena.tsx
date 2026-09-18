import { useState, type SubmitEvent } from 'react'
import { Link } from 'react-router'
import AuthLayout from '../layouts/AuthLayout'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function RecuperarContrasena() {
    const [correo, setCorreo] = useState('')
    const [enviado, setEnviado] = useState(false)
    const [error, setError] = useState('')

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault()

        if (!correo) {
            setError('Ingresá tu correo electrónico.')
            return
        }

        if (!EMAIL_REGEX.test(correo)) {
            setError('Ingresá un correo electrónico válido.')
            return
        }

        setError('')
        console.log({ correo })
        setEnviado(true)
    }

    return (
        <AuthLayout
            title="Recuperar contraseña"
            subtitle="Te enviaremos un enlace para restablecerla"
        >
            {enviado ? (
                <p className="text-center text-foreground">
                    Si el correo está registrado, vas a recibir un enlace en breve.
                </p>
            ) : (
                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                    <div>
                        <input
                            type="email"
                            placeholder="Correo electrónico"
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${error ? 'border-danger' : 'border-border'
                                }`}
                        />
                        {error && <p className="text-xs text-danger mt-1">{error}</p>}
                    </div>

                    <button
                        type="submit"
                        className="bg-primary hover:bg-primary-hover text-white font-heading font-semibold rounded-lg py-2 transition-colors cursor-pointer"
                    >
                        Enviar enlace
                    </button>
                </form>
            )}

            <p className="text-sm text-center text-muted mt-4">
                <Link to="/login" className="text-primary font-semibold">
                    Volver a iniciar sesión
                </Link>
            </p>
        </AuthLayout>
    )
}

export default RecuperarContrasena