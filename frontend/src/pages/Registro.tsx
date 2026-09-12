import { useState, type SubmitEvent } from 'react'
import { Link } from 'react-router'
import AuthLayout from '../layouts/AuthLayout'
import { MOCK_USUARIOS } from '../mocks/usuarios'

type Rol = 'interesado' | 'propietario' | 'inmobiliaria'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

interface Errores {
    nombre?: string
    apellido?: string
    correo?: string
    contrasena?: string
}

function Registro() {
    const [nombre, setNombre] = useState('')
    const [apellido, setApellido] = useState('')
    const [correo, setCorreo] = useState('')
    const [contrasena, setContrasena] = useState('')
    const [rol, setRol] = useState<Rol>('interesado')
    const [errores, setErrores] = useState<Errores>({})

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault()
        const nuevosErrores: Errores = {}

        if (!nombre) nuevosErrores.nombre = 'Ingresá tu nombre.'
        if (!apellido) nuevosErrores.apellido = 'Ingresá tu apellido.'

        if (!correo) {
            nuevosErrores.correo = 'Ingresá tu correo electrónico.'
        } else if (!EMAIL_REGEX.test(correo)) {
            nuevosErrores.correo = 'Ingresá un correo electrónico válido.'
        } else if (MOCK_USUARIOS.some((u) => u.correo === correo.toLowerCase())) {
            nuevosErrores.correo = 'Este correo ya está registrado.'
        }

        if (!contrasena) {
            nuevosErrores.contrasena = 'Ingresá una contraseña.'
        } else if (!PASSWORD_REGEX.test(contrasena)) {
            nuevosErrores.contrasena = 'La contraseña no cumple los requisitos.'
        }

        setErrores(nuevosErrores)
        if (Object.keys(nuevosErrores).length > 0) return

        // Acá más adelante se conecta con el backend (RF-01)
        console.log({ nombre, apellido, correo, contrasena, rol })
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
                            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errores.nombre ? 'border-primary' : 'border-gray-300'
                                }`}
                        />
                        {errores.nombre && <p className="text-xs text-primary mt-1">{errores.nombre}</p>}
                    </div>

                    <div className="w-full sm:w-1/2">
                        <input
                            type="text"
                            placeholder="Apellido"
                            value={apellido}
                            onChange={(e) => setApellido(e.target.value)}
                            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errores.apellido ? 'border-primary' : 'border-gray-300'
                                }`}
                        />
                        {errores.apellido && <p className="text-xs text-primary mt-1">{errores.apellido}</p>}
                    </div>
                </div>

                <div>
                    <input
                        type="email"
                        placeholder="Correo electrónico"
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errores.correo ? 'border-primary' : 'border-gray-300'
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
                        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errores.contrasena ? 'border-primary' : 'border-gray-300'
                            }`}
                    />
                    <p className={`text-xs mt-1 ${errores.contrasena ? 'text-primary' : 'text-gray-500'}`}>
                        Debe tener al menos 8 caracteres, con una mayúscula, una minúscula y un número.
                    </p>
                </div>

                <select
                    value={rol}
                    onChange={(e) => setRol(e.target.value as Rol)}
                    className="custom-select border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                    <option value="interesado">Busco una vivienda</option>
                    <option value="propietario">Soy propietario</option>
                    <option value="inmobiliaria">Soy una inmobiliaria</option>
                </select>

                <button
                    type="submit"
                    className="bg-primary hover:bg-primary-dark text-white font-heading font-semibold rounded-lg py-2 mt-2 transition-colors"
                >
                    Registrarme
                </button>

                <p className="text-sm text-center text-gray-500">
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