import { Link, useParams } from 'react-router'
import {
    BedDouble,
    Cat,
    Check,
    DoorOpen,
    GraduationCap,
    MapPin,
    Sofa,
    User,
    Wallet,
    Wrench,
} from 'lucide-react'
import PublicoLayout from '../layouts/PublicoLayout'
import CarruselFotos from '../components/CarruselFotos'
import Mapa from '../components/Mapa'
import { obtenerPublicacionPorId } from '../mocks/publicaciones'
import { obtenerUsuarioPorId } from '../mocks/usuarios'
import { formatearPrecio } from '../utils/formato'

const LAT_DEFECTO = -35.9666
const LNG_DEFECTO = -62.7333

function formatearFecha(valor: string): string {
    const [anio, mes, dia] = valor.split('-')
    return `${dia}/${mes}/${anio}`
}

function PublicacionDetalle() {
    const { id } = useParams<{ id: string }>()
    const publicacion = id ? obtenerPublicacionPorId(id) : undefined

    if (!publicacion || publicacion.estado !== 'activa') {
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

    const caracteristicas = [
        { activo: publicacion.serviciosIncluidos, texto: 'Servicios incluidos', Icono: Wrench },
        { activo: publicacion.amueblado, texto: 'Amueblado', Icono: Sofa },
        { activo: publicacion.aceptaMascotas, texto: 'Acepta mascotas', Icono: Cat },
        { activo: publicacion.aptoEstudiantes, texto: 'Apto estudiantes', Icono: GraduationCap },
    ].filter((c) => c.activo)

    return (
        <PublicoLayout>
            <Link to="/explorar" className="inline-block text-sm font-semibold text-muted hover:text-primary mb-4 cursor-pointer">
                ← Volver a explorar
            </Link>

            <div className="bg-surface rounded-2xl shadow-lg p-6 sm:p-8 flex flex-col gap-5">
                <CarruselFotos fotos={publicacion.fotos} descripcion={publicacion.descripcion} />

                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-primary-subtle text-primary capitalize">
                        {publicacion.tipoInmueble}
                    </span>
                    <span className="text-xs text-muted capitalize">{publicacion.modalidad}</span>
                </div>

                {publicador && (
                    <div className="flex items-center gap-2 bg-surface-hover rounded-lg px-3 py-2 w-fit">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-subtle text-primary shrink-0">
                            <User className="w-4 h-4" aria-hidden="true" />
                        </span>
                        <p className="text-sm text-foreground">
                            Publicado por <span className="font-semibold">{publicador.nombre} {publicador.apellido}</span>
                            <span className="text-muted">
                                {' '}· {publicador.rol === 'inmobiliaria' ? 'Inmobiliaria' : 'Propietario'}
                            </span>
                        </p>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h1 className="text-2xl font-heading font-semibold text-foreground">
                        {formatearPrecio(publicacion.precio)}
                    </h1>
                    {publicacion.expensas !== undefined && (
                        <p className="text-sm text-muted flex items-center gap-1.5">
                            <Wallet className="w-4 h-4" aria-hidden="true" />
                            Expensas: {formatearPrecio(publicacion.expensas)}
                        </p>
                    )}
                </div>

                <p className="text-sm text-muted flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
                    {publicacion.ubicacion}
                </p>

                <p className="text-sm text-foreground">{publicacion.descripcion}</p>

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
        </PublicoLayout>
    )
}

export default PublicacionDetalle
