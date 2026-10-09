import type { MouseEvent } from 'react'
import { Link } from 'react-router'
import { BedDouble, DoorOpen, Heart, MapPin, User } from 'lucide-react'
import { agregarFavorito, esFavorito, quitarFavorito } from '../mocks/favoritos'
import { obtenerSesion } from '../mocks/sesion'
import { obtenerUsuarioPorId } from '../mocks/usuarios'
import { mostrarToast } from '../mocks/toast'
import { formatearPrecio } from '../utils/formato'
import { ETIQUETAS_TIPO_INMUEBLE, type Publicacion } from '../types/publicacion'

interface TarjetaPublicacionProps {
    publicacion: Publicacion
    onFavoritoCambiado?: () => void
    vista?: 'grilla' | 'lista'
}

function TarjetaPublicacion({ publicacion, onFavoritoCambiado, vista = 'grilla' }: TarjetaPublicacionProps) {
    const enLista = vista === 'lista'
    const sesion = obtenerSesion()
    const publicador = obtenerUsuarioPorId(publicacion.propietarioId)
    const puedeGuardarFavorito = sesion?.rol === 'interesado'
    const favorita = puedeGuardarFavorito && esFavorito(sesion!.id, publicacion.id)

    function handleFavorito(e: MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        if (!sesion) return
        if (favorita) {
            quitarFavorito(sesion.id, publicacion.id)
            mostrarToast('Publicación quitada de favoritos.')
        } else {
            agregarFavorito(sesion.id, publicacion.id)
            mostrarToast('Publicación agregada a favoritos.')
        }
        onFavoritoCambiado?.()
    }

    return (
        <Link
            to={`/explorar/${publicacion.id}`}
            className={`bg-surface rounded-2xl shadow-card overflow-hidden flex cursor-pointer hover:-translate-y-1 transition-all ${enLista ? 'flex-col sm:flex-row' : 'flex-col'
                }`}
        >
            <div
                className={`relative bg-surface-hover flex items-center justify-center shrink-0 ${enLista ? 'h-40 sm:h-auto sm:w-56' : 'h-40'
                    }`}
            >
                {publicacion.fotos[0] ? (
                    <img
                        src={publicacion.fotos[0]}
                        alt={publicacion.descripcion}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <span className="text-xs text-muted">Sin foto</span>
                )}
                {puedeGuardarFavorito && (
                    <button
                        type="button"
                        onClick={handleFavorito}
                        aria-label={favorita ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                        aria-pressed={favorita}
                        className="absolute top-2 right-2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/90 shadow hover:bg-white transition-colors cursor-pointer"
                    >
                        <Heart
                            className={`w-4 h-4 ${favorita ? 'fill-primary text-primary' : 'text-[#1F4D3B]'}`}
                            aria-hidden="true"
                        />
                    </button>
                )}
            </div>
            <div className="p-4 flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-primary-subtle text-primary">
                        {ETIQUETAS_TIPO_INMUEBLE[publicacion.tipoInmueble]}
                    </span>
                    <span className="text-xs text-muted capitalize">{publicacion.modalidad}</span>
                </div>
                <p className="text-foreground font-heading font-semibold">
                    {formatearPrecio(publicacion.precio)}
                </p>
                <p className="text-sm text-muted line-clamp-2 whitespace-pre-line">{publicacion.descripcion}</p>
                <p className="text-xs text-muted flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    {publicacion.ubicacion}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted mt-1">
                    <span className="flex items-center gap-1">
                        <DoorOpen className="w-3.5 h-3.5" aria-hidden="true" />
                        {publicacion.ambientes} amb.
                    </span>
                    <span className="flex items-center gap-1">
                        <BedDouble className="w-3.5 h-3.5" aria-hidden="true" />
                        {publicacion.dormitorios} dorm.
                    </span>
                </div>
                {publicador && (
                    <p className="text-xs text-muted flex items-center gap-1 mt-1 pt-2 border-t border-border">
                        <User className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        {publicador.nombre} {publicador.apellido} ·{' '}
                        {publicador.rol === 'inmobiliaria' ? 'Inmobiliaria' : 'Propietario'}
                    </p>
                )}
            </div>
        </Link>
    )
}

export default TarjetaPublicacion
