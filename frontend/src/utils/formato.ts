export function formatearMiles(valor: number): string {
    return valor ? valor.toLocaleString('es-AR') : ''
}

export function quitarFormatoMiles(valorTexto: string): number {
    const soloDigitos = valorTexto.replace(/\D/g, '')
    return soloDigitos ? Number(soloDigitos) : 0
}

export function formatearPrecio(valor: number): string {
    return valor.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
}

export function formatearFecha(valor: string): string {
    const [anio, mes, dia] = valor.split('-')
    return `${dia}/${mes}/${anio}`
}

export function formatearFechaHora(iso: string): string {
    return new Date(iso).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export function formatearFechaCorta(iso: string): string {
    return new Date(iso).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    })
}
