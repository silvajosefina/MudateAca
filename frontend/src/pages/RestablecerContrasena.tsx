import { useState, type SubmitEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import AuthLayout from '../layouts/AuthLayout'
import InputContrasena from '../components/InputContrasena'
import { confirmarRecuperacion } from '../servicios/usuarios'
import { erroresDeCampos, mensajeDeError } from '../servicios/errores'

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

// Pantalla a la que lleva el enlace del correo de recuperación (RF-03):
// /restablecer-contrasena?uid=...&token=...
function RestablecerContrasena() {
    const [parametros] = useSearchParams()
    const uid = parametros.get('uid') ?? ''
    const token = parametros.get('token') ?? ''

    const [contrasena, setContrasena] = useState('')
    const [repetida, setRepetida] = useState('')
    const [error, setError] = useState('')
    const [listo, setListo] = useState(false)
    const [enviando, setEnviando] = useState(false)

    async function handleSubmit(e: SubmitEvent) {
        e.preventDefault()

        if (!PASSWORD_REGEX.test(contrasena)) {
            setError('La contraseña no cumple los requisitos.')
            return
        }
        if (contrasena !== repetida) {
            setError('Las contraseñas no coinciden.')
            return
        }

        setError('')
        setEnviando(true)
        try {
            await confirmarRecuperacion(uid, token, contrasena)
            setListo(true)
        } catch (err) {
            setError(erroresDeCampos(err).nueva_contrasena ?? mensajeDeError(err))
        } finally {
            setEnviando(false)
        }
    }

    const enlaceIncompleto = !uid || !token

    return (
        <AuthLayout title="Elegí una nueva contraseña">
            {enlaceIncompleto ? (
                <p className="text-center text-foreground">
                    El enlace de recuperación no es válido. Pedí uno nuevo desde{' '}
                    <Link to="/recuperar-contrasena" className="text-primary font-semibold">
                        Recuperar contraseña
                    </Link>
                    .
                </p>
            ) : listo ? (
                <p className="text-center text-foreground">Tu contraseña se actualizó. Ya podés iniciar sesión.</p>
            ) : (
                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                    <div>
                        <InputContrasena
                            value={contrasena}
                            onChange={setContrasena}
                            autoComplete="new-password"
                            conError={Boolean(error)}
                        />
                        <p className="text-xs text-muted mt-1">
                            Debe tener al menos 8 caracteres, con una mayúscula, una minúscula y un número.
                        </p>
                    </div>

                    <div>
                        <InputContrasena
                            value={repetida}
                            onChange={setRepetida}
                            autoComplete="new-password"
                            conError={Boolean(error)}
                            placeholder="Repetí la contraseña"
                        />
                        {error && <p className="text-xs text-danger mt-1">{error}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={enviando}
                        className="bg-primary hover:bg-primary-hover text-surface font-heading font-semibold rounded-lg py-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                    >
                        Guardar contraseña
                    </button>
                </form>
            )}

            <p className="text-sm text-center text-muted mt-4">
                <Link to="/login" className="text-primary font-semibold">
                    Ir a iniciar sesión
                </Link>
            </p>
        </AuthLayout>
    )
}

export default RestablecerContrasena
