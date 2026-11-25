import { contarNotificacionesNoLeidas } from '../servicios/notificaciones'
import { useContador } from './useContador'

export function useNotificacionesNoLeidas(usuarioId: string | undefined): number {
    return useContador(usuarioId, contarNotificacionesNoLeidas)
}
