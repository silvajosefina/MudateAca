import { contarMensajesNoLeidos } from '../servicios/mensajes'
import { useContador } from './useContador'

export function useMensajesNoLeidos(usuarioId: string | undefined): number {
    return useContador(usuarioId, contarMensajesNoLeidos)
}
