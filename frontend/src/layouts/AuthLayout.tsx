import type { ReactNode } from 'react'

interface AuthLayoutProps {
    title: string
    subtitle?: string
    children: ReactNode
}

function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-light px-4 py-8">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 sm:p-8">
                <div className="text-center mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-heading font-bold text-primary">Mudate Acá</h1>
                    <h2 className="text-lg sm:text-xl font-heading font-semibold text-neutral-dark mt-3 sm:mt-4">
                        {title}
                    </h2>
                    {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
                </div>
                {children}
            </div>
        </div>
    )
}

export default AuthLayout