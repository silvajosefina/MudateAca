import { useState, type SubmitEvent } from 'react'
import { Link } from 'react-router'
import AuthLayout from '../layouts/AuthLayout'

type Rol = 'interesado' | 'propietario' | 'inmobiliaria'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

function Registro() {
    const [nombre, setNombre] = useState('')
    const [apellido, setApellido] = useState('')
    const [correo, setCorreo] = useState('')
    const [contrasena, setContrasena] = useState('')
    const [rol, setRol] = useState<Rol>('interesado')
    const [error, setError] = useState('')

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault()

        if (!nombre || !apellido || !correo || !contrasena) {
            setError('Todos los campos son obligatorios.')
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
        console.log({ nombre, apellido, correo, contrasena, rol })
    }

    return (
        <AuthLayout title="Creá tu cuenta" subtitle="Buscá, publicá o administrá propiedades">
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                {error && (
                    <p className="text-sm text-primary bg-primary-light rounded-lg px-3 py-2">{error}</p>
                )}

                <div className="flex gap-3">
                    <input
                        type="text"
                        placeholder="Nombre"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="w-1/2 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                        type="text"
                        placeholder="Apellido"
                        value={apellido}
                        onChange={(e) => setApellido(e.target.value)}
                        className="w-1/2 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>

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