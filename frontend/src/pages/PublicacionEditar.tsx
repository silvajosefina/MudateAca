import { Link, useParams } from 'react-router'
import PanelLayout from '../layouts/PanelLayout'
import PublicacionForm from '../components/PublicacionForm'
import { obtenerPublicacionPorId } from '../mocks/publicaciones'
import { obtenerSesion } from '../mocks/sesion'

function PublicacionEditar() {
    const { id } = useParams<{ id: string }>()
    const sesion = obtenerSesion()
    const publicacion = id ? obtenerPublicacionPorId(id) : undefined

    const esPropia = publicacion && sesion && publicacion.propietarioId === sesion.id

    if (!publicacion || !esPropia) {
        return (
            <PanelLayout>
                <div className="bg-surface rounded-2xl shadow-lg p-6 sm:p-8 text-center">
                    <h2 className="text-lg font-heading font-semibold text-foreground mb-2">
                        Publicación no encontrada
                    </h2>
                    <p className="text-sm text-muted mb-4">
                        No existe o no tenés permiso para editar esta publicación.
                    </p>
                    <Link
                        to="/mis-publicaciones"
                        className="inline-block bg-primary hover:bg-primary-hover text-white font-heading font-semibold rounded-lg px-4 py-2 transition-colors cursor-pointer"
                    >
                        Volver a mis publicaciones
                    </Link>
                </div>
            </PanelLayout>
        )
    }

    if (publicacion.estado === 'alquilada') {
        return (
            <PanelLayout>
                <div className="bg-surface rounded-2xl shadow-lg p-6 sm:p-8 text-center">
                    <h2 className="text-lg font-heading font-semibold text-foreground mb-2">
                        Publicación alquilada
                    </h2>
                    <p className="text-sm text-muted mb-4">
                        Mientras esté alquilada, sus condiciones comerciales y características no se
                        pueden editar. Podés reactivarla desde "Mis publicaciones" una vez finalizado el
                        contrato.
                    </p>
                    <Link
                        to="/mis-publicaciones"
                        className="inline-block bg-primary hover:bg-primary-hover text-white font-heading font-semibold rounded-lg px-4 py-2 transition-colors cursor-pointer"
                    >
                        Volver a mis publicaciones
                    </Link>
                </div>
            </PanelLayout>
        )
    }

    return (
        <PanelLayout>
            <PublicacionForm modo="editar" publicacionExistente={publicacion} />
        </PanelLayout>
    )
}

export default PublicacionEditar
