import { useState, type SubmitEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import AuthLayout from '../layouts/AuthLayout'
import InputContrasena from '../components/InputContrasena'
import { iniciarSesion } from '../servicios/sesion'
import { ingresar, registrar } from '../servicios/usuarios'
import { erroresDeCampos, mensajeDeError } from '../servicios/errores'

type Rol = 'interesado' | 'propietario' | 'inmobiliaria'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
const CELULAR_REGEX = /^[0-9+\s-]{8,20}$/
// Los errores locales de contraseña solo marcan en rojo los requisitos; los del servidor
// (por ejemplo, una contraseña demasiado común) se muestran con su propio texto.
const ERRORES_LOCALES_CONTRASENA = ['Ingresá una contraseña.', 'La contraseña no cumple los requisitos.']

interface Errores {
    nombre?: string
    apellido?: string
    celular?: string
    correo?: string
    contrasena?: string
    razonSocial?: string
    general?: string
}

function Registro() {
    const navigate = useNavigate()
    const [nombre, setNombre] = useState('')
    const [apellido, setApellido] = useState('')
    const [celular, setCelular] = useState('')
    const [correo, setCorreo] = useState('')
    const [contrasena, setContrasena] = useState('')
    const [rol, setRol] = useState<Rol>('interesado')
    const [razonSocial, setRazonSocial] = useState('')
    const [errores, setErrores] = useState<Errores>({})
    const [enviando, setEnviando] = useState(false)

    async function handleSubmit(e: SubmitEvent) {
        e.preventDefault()
        const nuevosErrores: Errores = {}

        if (!nombre) nuevosErrores.nombre = 'Ingresá tu nombre.'
        if (!apellido) nuevosErrores.apellido = 'Ingresá tu apellido.'

        if (!celular) {
            nuevosErrores.celular = 'Ingresá tu número de celular.'
        } else if (!CELULAR_REGEX.test(celular)) {
            nuevosErrores.celular = 'Ingresá un número de celular válido.'
        }

        if (!correo) {
            nuevosErrores.correo = 'Ingresá tu correo electrónico.'
        } else if (!EMAIL_REGEX.test(correo)) {
            nuevosErrores.correo = 'Ingresá un correo electrónico válido.'
        }

        if (!contrasena) {
            nuevosErrores.contrasena = 'Ingresá una contraseña.'
        } else if (!PASSWORD_REGEX.test(contrasena)) {
            nuevosErrores.contrasena = 'La contraseña no cumple los requisitos.'
        }

        if (rol === 'inmobiliaria' && !razonSocial.trim()) {
            nuevosErrores.razonSocial = 'Indicá la razón social de la inmobiliaria.'
        }

        setErrores(nuevosErrores)
        if (Object.keys(nuevosErrores).length > 0) return

        setEnviando(true)
        try {
            await registrar({
                nombre: nombre.trim(),
                apellido: apellido.trim(),
                celular: celular.trim(),
                correo: correo.trim(),
                contrasena,
                rol,
                razonSocial: rol === 'inmobiliaria' ? razonSocial.trim() : undefined,
            })
            // Con la cuenta creada, inicia sesión directamente para no pedir los datos otra vez.
            const usuario = await ingresar(correo.trim(), contrasena)
            iniciarSesion(usuario)
            navigate(rol === 'interesado' ? '/explorar' : '/mis-publicaciones')
        } catch (error) {
            const campos = erroresDeCampos(error)
            const errorDelServidor: Errores = {
                nombre: campos.nombre,
                apellido: campos.apellido,
                celular: campos.celular,
                correo: campos.correo,
                contrasena: campos.contrasena,
                razonSocial: campos.razon_social,
            }
            const hayErrorDeCampo = Object.values(errorDelServidor).some(Boolean)
            setErrores(hayErrorDeCampo ? errorDelServidor : { general: mensajeDeError(error) })
        } finally {
            setEnviando(false)
        }
    }

    return (
        <AuthLayout title="Creá tu cuenta" subtitle="Buscá, publicá o administrá propiedades">
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-3">
                    <div className="w-full sm:w-1/2">
                        <input
                            type="text"
                            placeholder="Nombre"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errores.nombre ? 'border-danger' : 'border-border'
                                }`}
                        />
                        {errores.nombre && <p className="text-xs text-danger mt-1">{errores.nombre}</p>}
                    </div>

                    <div className="w-full sm:w-1/2">
                        <input
                            type="text"
                            placeholder="Apellido"
                            value={apellido}
                            onChange={(e) => setApellido(e.target.value)}
                            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errores.apellido ? 'border-danger' : 'border-border'
                                }`}
                        />
                        {errores.apellido && <p className="text-xs text-danger mt-1">{errores.apellido}</p>}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 sm:gap-3">
                    <div className="w-full sm:w-1/2">
                        <input
                            type="tel"
                            placeholder="Celular"
                            value={celular}
                            onChange={(e) => setCelular(e.target.value)}
                            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errores.celular ? 'border-danger' : 'border-border'
                                }`}
                        />
                        {errores.celular && <p className="text-xs text-danger mt-1">{errores.celular}</p>}
                    </div>

                    <div className="w-full sm:w-1/2">
                        <input
                            type="email"
                            placeholder="Correo electrónico"
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errores.correo ? 'border-danger' : 'border-border'
                                }`}
                        />
                        {errores.correo && <p className="text-xs text-danger mt-1">{errores.correo}</p>}
                    </div>
                </div>

                <div>
                    <InputContrasena
                        value={contrasena}
                        onChange={setContrasena}
                        autoComplete="new-password"
                        conError={Boolean(errores.contrasena)}
                    />
                    <p className={`text-xs mt-1 ${errores.contrasena ? 'text-danger' : 'text-muted'}`}>
                        {errores.contrasena && !ERRORES_LOCALES_CONTRASENA.includes(errores.contrasena)
                            ? errores.contrasena
                            : 'Debe tener al menos 8 caracteres, con una mayúscula, una minúscula y un número.'}
                    </p>
                </div>

                <select
                    value={rol}
                    onChange={(e) => setRol(e.target.value as Rol)}
                    className="custom-select border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                    <option value="interesado">Busco una vivienda</option>
                    <option value="propietario">Soy propietario</option>
                    <option value="inmobiliaria">Soy una inmobiliaria</option>
                </select>

                {rol === 'inmobiliaria' && (
                    <div>
                        <input
                            type="text"
                            placeholder="Razón social"
                            value={razonSocial}
                            onChange={(e) => setRazonSocial(e.target.value)}
                            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errores.razonSocial ? 'border-danger' : 'border-border'
                                }`}
                        />
                        {errores.razonSocial && <p className="text-xs text-danger mt-1">{errores.razonSocial}</p>}
                    </div>
                )}

                {errores.general && <p className="text-xs text-danger text-center">{errores.general}</p>}

                <button
                    type="submit"
                    disabled={enviando}
                    className="bg-primary hover:bg-primary-hover text-surface font-heading font-semibold rounded-lg py-2 mt-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                >
                    Registrarme
                </button>

                <p className="text-sm text-center text-muted">
                    ¿Ya tenés cuenta?{' '}
                    <Link to="/login" className="text-primary font-semibold">
                        Iniciá sesión
                    </Link>
                </p>
            </form>
        </AuthLayout>
    )
}

export default Registro