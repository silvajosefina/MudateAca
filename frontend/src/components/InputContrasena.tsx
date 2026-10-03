import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface InputContrasenaProps {
    value: string
    onChange: (valor: string) => void
    placeholder?: string
    autoComplete?: string
    conError?: boolean
    id?: string
}

function InputContrasena({ value, onChange, placeholder = 'Contraseña', autoComplete, conError, id }: InputContrasenaProps) {
    const [visible, setVisible] = useState(false)

    return (
        <div className="relative">
            <input
                id={id}
                type={visible ? 'text' : 'password'}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoComplete={autoComplete}
                className={`w-full border rounded-lg pl-3 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${conError ? 'border-danger' : 'border-border'
                    }`}
            />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={visible}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-full text-muted hover:text-primary hover:bg-primary-subtle transition-colors cursor-pointer"
            >
                {visible ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
            </button>
        </div>
    )
}

export default InputContrasena
