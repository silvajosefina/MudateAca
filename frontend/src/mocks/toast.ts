export type TipoToast = 'exito' | 'error'

export interface ToastState {
    id: number
    mensaje: string
    tipo: TipoToast
}

type Escucha = (toast: ToastState) => void

let contador = 0
let escuchas: Escucha[] = []

export function mostrarToast(mensaje: string, tipo: TipoToast = 'exito') {
    const toast: ToastState = { id: ++contador, mensaje, tipo }
    escuchas.forEach((escucha) => escucha(toast))
}

export function suscribirseAToast(escucha: Escucha): () => void {
    escuchas.push(escucha)
    return () => {
        escuchas = escuchas.filter((e) => e !== escucha)
    }
}
