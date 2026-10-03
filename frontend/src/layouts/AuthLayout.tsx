import type { ReactNode } from 'react'
import Footer from '../components/Footer'

interface AuthLayoutProps {
    title: string
    subtitle?: string
    children: ReactNode
}

function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <div className="flex-1 flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-md bg-surface rounded-2xl shadow-lg p-6 sm:p-8">
                    <div className="text-center mb-6 sm:mb-8">
                        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-primary">Mudate Acá</h1>
                        <h2 className="text-lg sm:text-xl font-heading font-semibold text-foreground mt-3 sm:mt-4">
                            {title}
                        </h2>
                        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
                    </div>
                    {children}
                </div>
            </div>
            <Footer />
        </div>
    )
}

export default AuthLayout