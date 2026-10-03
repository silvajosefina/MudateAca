import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
    ArrowLeft,
    BedDouble,
    Cat,
    Check,
    DoorOpen,
    GraduationCap,
    Heart,
    LogIn,
    MapPin,
    MessageCircle,
    Pencil,
    ShieldCheck,
    Sofa,
    User,
    Wallet,
    Wrench,
} from 'lucide-react'
import PublicoLayout from '../layouts/PublicoLayout'
import GaleriaMosaico from '../components/GaleriaMosaico'
import ModalGaleria from '../components/ModalGaleria'
import Mapa from '../components/Mapa'
import { obtenerPublicacionPorId } from '../mocks/publicaciones'
import { obtenerUsuarioPorId } from '../mocks/usuarios'
import { obtenerSesion } from '../mocks/sesion'
import { agregarFavorito, esFavorito, quitarFavorito } from '../mocks/favoritos'
import { obtenerOCrearConversacion } from '../mocks/mensajes'
import { mostrarToast } from '../mocks/toast'
import { formatearPrecio } from '../utils/formato'
import { ETIQUETAS_TIPO_INMUEBLE } from '../types/publicacion'

const LAT_DEFECTO = -35.9666
const LNG_DEFECTO = -62.7333

function formatearFecha(valor: string): string {
    const [anio, mes, dia] = valor.split('-')
    return `${dia}/${mes}/${anio}`
}

function PublicacionDetalle() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const sesion = obtenerSesion()
    const publicacion = id ? obtenerPublicacionPorId(id) : undefined
    const [, forzarActualizacion] = useState(0)
    const [galeriaAbierta, setGaleriaAbierta] = useState<number | null>(null)
    const esDueño = Boolean(sesion && publicacion && sesion.id === publicacion.propietarioId)

    if (!publicacion || (publicacion.estado !== 'activa' && (!esDueño || publicacion.estado === 'eliminada'))) {
        return (
            <PublicoLayout>
                <div className="bg-surface rounded-2xl shadow-lg p-6 sm:p-8 text-center">
                    <h2 className="text-lg font-heading font-semibold text-foreground mb-2">
                        Publicación no disponible
                    </h2>
                    <p className="text-sm text-muted mb-4">
                        Esta publicación no existe o ya no está disponible.
                    </p>
                    <Link
                        to="/explorar"
                        className="inline-block bg-primary hover:bg-primary-hover text-foreground font-heading font-semibold rounded-lg px-4 py-2 transition-colors cursor-pointer"
                    >
                        Volver a explorar
                    </Link>
                </div>
            </PublicoLayout>
        )
    }

    const publicador = obtenerUsuarioPorId(publicacion.propietarioId)
    const puedeGuardarFavorito = sesion?.rol === 'interesado'
    const favorita = Boolean(puedeGuardarFavorito && esFavorito(sesion!.id, publicacion.id))

    function handleFavorito() {
        if (!sesion) return
        if (favorita) {
            quitarFavorito(sesion.id, publicacion!.id)
            mostrarToast('Publicación quitada de favoritos.')
        } else {
            agregarFavorito(sesion.id, publicacion!.id)
            mostrarToast('Publicación agregada a favoritos.')
        }
        forzarActualizacion((n) => n + 1)
    }

    function handleContactar() {
        if (!sesion) return
        const conversacion = obtenerOCrearConversacion(publicacion!.id, sesion.id, publicacion!.propietarioId)
        navigate(`/mensajes?conversacion=${conversacion.id}`)
    }

    const caracteristicas = [
        { activo: publicacion.serviciosIncluidos, texto: 'Servicios incluidos', Icono: Wrench },
        { activo: publicacion.amueblado, texto: 'Amueblado', Icono: Sofa },
        { activo: publicacion.aceptaMascotas, texto: 'Acepta mascotas', Icono: Cat },
        { activo: publicacion.aptoEstudiantes, texto: 'Apto estudiantes', Icono: GraduationCap },
    ].filter((c) => c.activo)

    return (
        <PublicoLayout>
            <Link to="/explorar" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary mb-4 cursor-pointer">
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Volver a explorar
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
                <div className="flex flex-col gap-6 min-w-0">
                    <div className="bg-surface rounded-2xl shadow-lg p-3 sm:p-4">
                        <GaleriaMosaico
                            fotos={publicacion.fotos}
                            descripcion={publicacion.descripcion}
                            onAbrir={setGaleriaAbierta}
                        />
                    </div>

                    <div className="bg-surface rounded-2xl shadow-lg p-6 sm:p-8 flex flex-col gap-5">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-primary-subtle text-primary">
                                {ETIQUETAS_TIPO_INMUEBLE[publicacion.tipoInmueble]}
                            </span>
                            <span className="text-xs text-muted capitalize">{publicacion.modalidad}</span>
                        </div>

                        <p className="text-sm text-foreground whitespace-pre-line">{publicacion.descripcion}</p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-muted">
                            <span className="flex items-center gap-1.5">
                                <DoorOpen className="w-4 h-4" aria-hidden="true" />
                                {publicacion.ambientes} ambiente(s)
                            </span>
                            <span className="flex items-center gap-1.5">
                                <BedDouble className="w-4 h-4" aria-hidden="true" />
                                {publicacion.dormitorios} dormitorio(s)
                            </span>
                            <span>Disponible desde {formatearFecha(publicacion.disponibleDesde)}</span>
                            {publicacion.disponibleHasta && (
                                <span>Disponible hasta {formatearFecha(publicacion.disponibleHasta)}</span>
                            )}
                        </div>

                        {publicacion.modalidad === 'temporario' && publicacion.duracionMinima && (
                            <p className="text-sm text-muted">Duración mínima: {publicacion.duracionMinima}</p>
                        )}

                        {caracteristicas.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-foreground mb-2">Características</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {caracteristicas.map(({ texto, Icono }) => (
                                        <span
                                            key={texto}
                                            className="flex items-center gap-1.5 text-sm text-foreground bg-surface-hover rounded-lg px-3 py-2"
                                        >
                                            <Icono className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
                                            {texto}
                                            <Check className="w-3.5 h-3.5 text-accent ml-auto shrink-0" aria-hidden="true" />
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {publicacion.requisitos && (
                            <div>
                                <h3 className="text-sm font-semibold text-foreground mb-1">Requisitos solicitados</h3>
                                <p className="text-sm text-muted">{publicacion.requisitos}</p>
                            </div>
                        )}

                        <div>
                            <h3 className="text-sm font-semibold text-foreground mb-2">Ubicación en el mapa</h3>
                            <Mapa
                                lat={publicacion.lat ?? LAT_DEFECTO}
                                lng={publicacion.lng ?? LNG_DEFECTO}
                                alturaClase="h-72"
                            />
                        </div>
                    </div>
                </div>

                <aside className="lg:sticky lg:top-20 bg-surface rounded-2xl shadow-lg p-6 flex flex-col gap-4">
                    <div>
                        <h1 className="text-2xl font-heading font-semibold text-foreground">
                            {formatearPrecio(publicacion.precio)}
                        </h1>
                        {publicacion.expensas !== undefined && (
                            <p className="text-sm text-muted flex items-center gap-1.5 mt-1">
                                <Wallet className="w-4 h-4 shrink-0" aria-hidden="true" />
                                Expensas: {formatearPrecio(publicacion.expensas)}
                            </p>
                        )}
                        <p className="text-sm text-muted flex items-center gap-1.5 mt-1">
                            <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
                            {publicacion.ubicacion}
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                        {esDueño ? (
                            <>
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent-subtle rounded-lg px-3 py-2">
                                    <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                                    Esta es tu publicación
                                </div>
                                <Link
                                    to={`/publicaciones/${publicacion.id}/editar`}
                                    className="inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-foreground text-sm font-semibold rounded-lg px-3 py-2.5 transition-colors cursor-pointer"
                                >
                                    <Pencil className="w-4 h-4" aria-hidden="true" />
                                    Editar publicación
                                </Link>
                            </>
                        ) : sesion?.rol === 'interesado' ? (
                            <>
                                <button
                                    type="button"
                                    onClick={handleContactar}
                                    className="inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-foreground text-sm font-semibold rounded-lg px-3 py-2.5 transition-colors cursor-pointer"
                                >
                                    <MessageCircle className="w-4 h-4" aria-hidden="true" />
                                    Contactar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleFavorito}
                                    aria-pressed={favorita}
                                    className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-2.5 border border-border text-foreground hover:border-primary transition-colors cursor-pointer"
                                >
                                    <Heart className={`w-4 h-4 ${favorita ? 'fill-primary text-primary' : ''}`} aria-hidden="true" />
                                    {favorita ? 'En favoritos' : 'Guardar en favoritos'}
                                </button>
                            </>
                        ) : !sesion ? (
                            <Link
                                to="/login"
                                className="inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-foreground text-sm font-semibold rounded-lg px-3 py-2.5 transition-colors cursor-pointer"
                            >
                                <LogIn className="w-4 h-4" aria-hidden="true" />
                                Iniciá sesión para contactar
                            </Link>
                        ) : null}
                    </div>

                    {publicador && (
                        <div className="flex items-center gap-2 bg-surface-hover rounded-lg px-3 py-2.5 mt-1">
                            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary-subtle text-primary shrink-0">
                                <User className="w-4 h-4" aria-hidden="true" />
                            </span>
                            <p className="text-sm text-foreground min-w-0">
                                <span className="font-semibold block truncate">{publicador.nombre} {publicador.apellido}</span>
                                <span className="text-muted text-xs">
                                    {publicador.rol === 'inmobiliaria' ? 'Inmobiliaria' : 'Propietario'}
                                </span>
                            </p>
                        </div>
                    )}
                </aside>
            </div>

            {galeriaAbierta !== null && (
                <ModalGaleria
                    fotos={publicacion.fotos}
                    descripcion={publicacion.descripcion}
                    indiceInicial={galeriaAbierta}
                    onClose={() => setGaleriaAbierta(null)}
                />
            )}
        </PublicoLayout>
    )
}

export default PublicacionDetalle
