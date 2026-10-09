import { useState } from 'react'
import { Heart } from 'lucide-react'
import PublicoLayout from '../layouts/PublicoLayout'
import TarjetaPublicacion from '../components/TarjetaPublicacion'
import Paginacion from '../components/Paginacion'
import { obtenerFavoritosDeUsuario } from '../mocks/favoritos'
import { obtenerSesion } from '../mocks/sesion'
import type { Publicacion } from '../types/publicacion'

const RESULTADOS_POR_PAGINA = 9

function MisFavoritos() {
    const sesion = obtenerSesion()
    const [favoritos, setFavoritos] = useState<Publicacion[]>(() =>
        sesion ? obtenerFavoritosDeUsuario(sesion.id) : [],
    )
    const [paginaActual, setPaginaActual] = useState(1)

    if (!sesion) return null

    function refrescar() {
        setFavoritos(obtenerFavoritosDeUsuario(sesion!.id))
    }

    const totalPaginas = Math.max(1, Math.ceil(favoritos.length / RESULTADOS_POR_PAGINA))
    const paginaSegura = Math.min(paginaActual, totalPaginas)
    const favoritosPagina = favoritos.slice(
        (paginaSegura - 1) * RESULTADOS_POR_PAGINA,
        paginaSegura * RESULTADOS_POR_PAGINA,
    )

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
                    {favoritosPagina.map((publicacion) => (
                        <TarjetaPublicacion
                            key={publicacion.id}
                            publicacion={publicacion}
                            onFavoritoCambiado={refrescar}
                        />
                    ))}
                </div>
            )}

            <Paginacion paginaActual={paginaSegura} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
        </PublicoLayout>
    )
}

export default MisFavoritos
