import type { ReactNode } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'

interface PublicoLayoutProps {
    children: ReactNode
}

function PublicoLayout({ children }: PublicoLayoutProps) {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />
            <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8 flex-1 w-full">{children}</main>
            <Footer />
        </div>
    )
}

export default PublicoLayout
