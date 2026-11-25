import type { Publicacion, TipoEventoModeracion } from '../types/publicacion'

// Eventos que dejan una publicación observada, en el mismo orden en que los evalúa el backend.
const EVENTOS_DE_OBSERVACION: TipoEventoModeracion[] = ['solicitud_modificacion', 'moderacion_automatica', 'mantener_observada']

// La nota de una publicación observada puede venir de un administrador o de la moderación
// automática (RF-06). La API envía los eventos del más nuevo al más viejo.
export function etiquetaNotaModeracion(publicacion: Pick<Publicacion, 'eventosModeracion'>): string {
    const ultimo = publicacion.eventosModeracion?.find((evento) => EVENTOS_DE_OBSERVACION.includes(evento.tipo))
    return ultimo?.tipo === 'moderacion_automatica' ? 'Revisión automática' : 'Nota del administrador'
}
