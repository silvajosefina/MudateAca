import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import PanelLayout from '../layouts/PanelLayout'
import PublicacionForm from '../components/PublicacionForm'
import { obtenerPublicacion } from '../servicios/publicaciones'
import { obtenerSesion } from '../servicios/sesion'
import { ETIQUETAS_ESTADO_PUBLICACION, type EstadoPublicacion, type Publicacion } from '../types/publicacion'

// Mismos estados que acepta el backend para editar (RF-10).
const ESTADOS_EDITABLES: EstadoPublicacion[] = ['pendiente_moderacion', 'activa', 'pausada', 'observada', 'rechazada']

function Aviso({ titulo, mensaje }: { titulo: string; mensaje: string }) {
    return (
        <PanelLayout>
            <div className="bg-surface rounded-2xl shadow-lg p-6 sm:p-8 text-center">
                <h2 className="text-lg font-heading font-semibold text-foreground mb-2">{titulo}</h2>
                <p className="text-sm text-muted mb-4">{mensaje}</p>
                <Link
                    to="/mis-publicaciones"
                    className="inline-block bg-primary hover:bg-primary-hover text-surface font-heading font-semibold rounded-lg px-4 py-2 transition-colors cursor-pointer"
                >
                    Volver a mis publicaciones
                </Link>
            </div>
        </PanelLayout>
    )
}

function PublicacionEditar() {
    const { id } = useParams<{ id: string }>()
    const sesion = obtenerSesion()
    const [publicacion, setPublicacion] = useState<Publicacion | null>(null)
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        if (!id) return
        obtenerPublicacion(id)
            .then(setPublicacion)
            .catch(() => setPublicacion(null))
            .finally(() => setCargando(false))
    }, [id])

    if (cargando) {
        return (
            <PanelLayout>
                <p className="text-sm text-muted text-center py-12">Cargando publicación…</p>
            </PanelLayout>
        )
    }

    const esPropia = publicacion && sesion && publicacion.propietarioId === sesion.id

    if (!publicacion || !esPropia) {
        return (
            <Aviso
                titulo="Publicación no encontrada"
                mensaje="No existe o no tenés permiso para editar esta publicación."
            />
        )
    }

    if (publicacion.estado === 'alquilada' || publicacion.estado === 'reservada') {
        return (
            <Aviso
                titulo={`Publicación ${ETIQUETAS_ESTADO_PUBLICACION[publicacion.estado].texto.toLowerCase()}`}
                mensaje="Mientras esté reservada o alquilada, sus condiciones comerciales y características no se pueden editar. Podés reactivarla desde Mis publicaciones."
            />
        )
    }

    if (!ESTADOS_EDITABLES.includes(publicacion.estado)) {
        return (
            <Aviso
                titulo="No se puede editar"
                mensaje={`Una publicación en estado "${ETIQUETAS_ESTADO_PUBLICACION[publicacion.estado].texto.toLowerCase()}" no se puede editar.`}
            />
        )
    }

    return (
        <PanelLayout>
            <PublicacionForm modo="editar" publicacionExistente={publicacion} />
        </PanelLayout>
    )
}

export default PublicacionEditar
