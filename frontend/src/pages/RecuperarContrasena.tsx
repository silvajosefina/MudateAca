import { useState, type SubmitEvent } from 'react'
import { Link } from 'react-router'
import AuthLayout from '../layouts/AuthLayout'
import { solicitarRecuperacion } from '../servicios/usuarios'
import { mensajeDeError } from '../servicios/errores'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function RecuperarContrasena() {
    const [correo, setCorreo] = useState('')
    const [enviado, setEnviado] = useState(false)
    const [error, setError] = useState('')
    const [enviando, setEnviando] = useState(false)

    async function handleSubmit(e: SubmitEvent) {
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
        setEnviando(true)
        try {
            await solicitarRecuperacion(correo.trim())
            setEnviado(true)
        } catch (err) {
            setError(mensajeDeError(err))
        } finally {
            setEnviando(false)
        }
    }

    return (
        <AuthLayout
            title="Recuperar contraseña"
            subtitle="Te enviaremos un enlace para restablecerla"
        >
            {enviado ? (
                <p className="text-center text-foreground">
                    Si el correo está registrado, vas a recibir un enlace en breve. Revisá también la
                    carpeta de correo no deseado.
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
                        disabled={enviando}
                        className="bg-primary hover:bg-primary-hover text-surface font-heading font-semibold rounded-lg py-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
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