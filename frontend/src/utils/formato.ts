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
