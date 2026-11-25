import { useState } from 'react'
import { Heart, HeartOff, LayoutGrid, List } from 'lucide-react'
import PublicoLayout from '../layouts/PublicoLayout'
import TarjetaPublicacion from '../components/TarjetaPublicacion'
import Paginacion from '../components/Paginacion'
import { listarFavoritos, quitarFavorito } from '../servicios/favoritos'
import { mensajeDeError } from '../servicios/errores'
import { obtenerSesion } from '../servicios/sesion'
import { useConsulta } from '../hooks/useConsulta'
import { guardarVistaListado, obtenerVistaListado } from '../utils/preferenciasVista'
import { mostrarToast } from '../utils/toast'
import { ETIQUETAS_ESTADO_PUBLICACION } from '../types/publicacion'

const RESULTADOS_POR_PAGINA = 9

function MisFavoritos() {
    const sesion = obtenerSesion()
    const [paginaActual, setPaginaActual] = useState(1)
    const [vista, setVista] = useState(() => obtenerVistaListado())
    const consulta = useConsulta(String(paginaActual), () => listarFavoritos(paginaActual))
    const favoritos = consulta.datos?.results ?? []
    const refrescar = consulta.recargar

    if (!sesion) return null

    async function handleQuitarNoDisponible(publicacionId: string) {
        try {
            await quitarFavorito(publicacionId)
            mostrarToast('Publicación quitada de favoritos.')
            refrescar()
        } catch (error) {
            mostrarToast(mensajeDeError(error), 'error')
        }
    }

    function cambiarVista(nuevaVista: 'grilla' | 'lista') {
        setVista(nuevaVista)
        guardarVistaListado(nuevaVista)
    }

    const totalPaginas = Math.max(1, Math.ceil((consulta.datos?.count ?? 0) / RESULTADOS_POR_PAGINA))

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

            {consulta.cargando && favoritos.length === 0 ? (
                <div className="bg-surface rounded-2xl shadow-lg p-8 text-center text-sm text-muted">
                    Cargando tus favoritos…
                </div>
            ) : consulta.error ? (
                <div className="bg-surface rounded-2xl shadow-lg p-8 text-center text-sm text-danger">
                    {mensajeDeError(consulta.error, 'No se pudieron cargar tus favoritos.')}
                </div>
            ) : favoritos.length === 0 ? (
                <div className="bg-surface rounded-2xl shadow-lg p-8 text-center text-sm text-muted">
                    Todavía no guardaste ninguna publicación como favorita. Marcá el corazón en una
                    publicación para verla acá.
                </div>
            ) : (
                <div className={vista === 'grilla' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'flex flex-col gap-4'}>
                    {favoritos.map((favorito) =>
                        favorito.publicacion ? (
                            <TarjetaPublicacion
                                key={favorito.id}
                                publicacion={favorito.publicacion}
                                vista={vista}
                                onFavoritoCambiado={refrescar}
                            />
                        ) : (
                            // RF-14: una favorita que dejó de ser pública se muestra como no disponible.
                            <div
                                key={favorito.id}
                                className="bg-surface rounded-2xl shadow-card p-4 flex flex-col items-center justify-center gap-2 text-center min-h-40"
                            >
                                <p className="text-sm font-semibold text-foreground">Publicación no disponible</p>
                                <p className="text-xs text-muted">
                                    Ahora está {ETIQUETAS_ESTADO_PUBLICACION[favorito.estado].texto.toLowerCase()}.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => handleQuitarNoDisponible(favorito.publicacionId)}
                                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-danger transition-colors cursor-pointer"
                                >
                                    <HeartOff className="w-4 h-4" aria-hidden="true" />
                                    Quitar de favoritos
                                </button>
                            </div>
                        ),
                    )}
                </div>
            )}

            <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
        </PublicoLayout>
    )
}

export default MisFavoritos
