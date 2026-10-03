import { useState } from 'react'
import { Heart } from 'lucide-react'
import PublicoLayout from '../layouts/PublicoLayout'
import TarjetaPublicacion from '../components/TarjetaPublicacion'
import { obtenerFavoritosDeUsuario } from '../mocks/favoritos'
import { obtenerSesion } from '../mocks/sesion'
import type { Publicacion } from '../types/publicacion'

function MisFavoritos() {
    const sesion = obtenerSesion()
    const [favoritos, setFavoritos] = useState<Publicacion[]>(() =>
        sesion ? obtenerFavoritosDeUsuario(sesion.id) : [],
    )

    if (!sesion) return null

    function refrescar() {
        setFavoritos(obtenerFavoritosDeUsuario(sesion!.id))
    }

    return (
        <PublicoLayout>
            <h1 className="flex items-center gap-2 text-lg sm:text-xl font-heading font-semibold text-foreground mb-6">
                <Heart className="w-5 h-5 text-primary" aria-hidden="true" />
                Mis favoritos
            </h1>

            {favoritos.length === 0 ? (
                <div className="bg-surface rounded-2xl shadow-lg p-8 text-center text-sm text-muted">
                    Todavía no guardaste ninguna publicación como favorita. Marcá el corazón en una
                    publicación para verla acá.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {favoritos.map((publicacion) => (
                        <TarjetaPublicacion
                            key={publicacion.id}
                            publicacion={publicacion}
                            onFavoritoCambiado={refrescar}
                        />
                    ))}
                </div>
            )}
        </PublicoLayout>
    )
}

export default MisFavoritos
