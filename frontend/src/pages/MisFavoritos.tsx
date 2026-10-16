import { useState } from 'react'
import { Heart, LayoutGrid, List } from 'lucide-react'
import PublicoLayout from '../layouts/PublicoLayout'
import TarjetaPublicacion from '../components/TarjetaPublicacion'
import Paginacion from '../components/Paginacion'
import { obtenerFavoritosDeUsuario } from '../mocks/favoritos'
import { obtenerSesion } from '../mocks/sesion'
import { guardarVistaListado, obtenerVistaListado } from '../mocks/preferenciasVista'
import type { Publicacion } from '../types/publicacion'

const RESULTADOS_POR_PAGINA = 9

function MisFavoritos() {
    const sesion = obtenerSesion()
    const [favoritos, setFavoritos] = useState<Publicacion[]>(() =>
        sesion ? obtenerFavoritosDeUsuario(sesion.id) : [],
    )
    const [paginaActual, setPaginaActual] = useState(1)
    const [vista, setVista] = useState(() => obtenerVistaListado())

    if (!sesion) return null

    function refrescar() {
        setFavoritos(obtenerFavoritosDeUsuario(sesion!.id))
    }

    function cambiarVista(nuevaVista: 'grilla' | 'lista') {
        setVista(nuevaVista)
        guardarVistaListado(nuevaVista)
    }

    const totalPaginas = Math.max(1, Math.ceil(favoritos.length / RESULTADOS_POR_PAGINA))
    const paginaSegura = Math.min(paginaActual, totalPaginas)
    const favoritosPagina = favoritos.slice(
        (paginaSegura - 1) * RESULTADOS_POR_PAGINA,
        paginaSegura * RESULTADOS_POR_PAGINA,
    )

    return (
        <PublicoLayout>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                <h1 className="flex items-center gap-2 text-lg sm:text-xl font-heading font-semibold text-foreground">
                    <Heart className="w-5 h-5 text-primary" aria-hidden="true" />
                    Mis favoritos
                </h1>

                {favoritos.length > 0 && (
                    <div className="flex gap-1 rounded-lg border border-border p-1 bg-surface shrink-0">
                        <button
                            type="button"
                            onClick={() => cambiarVista('grilla')}
                            aria-label="Ver como grilla"
                            aria-pressed={vista === 'grilla'}
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors cursor-pointer ${vista === 'grilla' ? 'bg-primary text-surface' : 'text-muted hover:bg-surface-hover'
                                }`}
                        >
                            <LayoutGrid className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={() => cambiarVista('lista')}
                            aria-label="Ver como lista"
                            aria-pressed={vista === 'lista'}
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors cursor-pointer ${vista === 'lista' ? 'bg-primary text-surface' : 'text-muted hover:bg-surface-hover'
                                }`}
                        >
                            <List className="w-4 h-4" aria-hidden="true" />
                        </button>
                    </div>
                )}
            </div>

            {favoritos.length === 0 ? (
                <div className="bg-surface rounded-2xl shadow-lg p-8 text-center text-sm text-muted">
                    Todavía no guardaste ninguna publicación como favorita. Marcá el corazón en una
                    publicación para verla acá.
                </div>
            ) : (
                <div className={vista === 'grilla' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'flex flex-col gap-4'}>
                    {favoritosPagina.map((publicacion) => (
                        <TarjetaPublicacion
                            key={publicacion.id}
                            publicacion={publicacion}
                            vista={vista}
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
