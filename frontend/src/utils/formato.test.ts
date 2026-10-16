import {
    formatearFecha,
    formatearFechaCorta,
    formatearFechaHora,
    formatearMiles,
    formatearPrecio,
    quitarFormatoMiles,
} from './formato'

describe('formatearMiles', () => {
    test('separa miles con el formato es-AR', () => {
        expect(formatearMiles(1000)).toBe('1.000')
        expect(formatearMiles(1234567)).toBe('1.234.567')
    })

    test('devuelve string vacío para 0 (valor falsy)', () => {
        expect(formatearMiles(0)).toBe('')
    })

    test('formatea números negativos', () => {
        expect(formatearMiles(-5000)).toBe('-5.000')
    })

    test('no agrega separador para números de un solo dígito', () => {
        expect(formatearMiles(5)).toBe('5')
    })
})

describe('quitarFormatoMiles', () => {
    test('quita los puntos separadores y devuelve el número', () => {
        expect(quitarFormatoMiles('1.000')).toBe(1000)
        expect(quitarFormatoMiles('1.234.567')).toBe(1234567)
    })

    test('devuelve 0 para string vacío', () => {
        expect(quitarFormatoMiles('')).toBe(0)
    })

    test('devuelve 0 cuando no hay ningún dígito', () => {
        expect(quitarFormatoMiles('abc')).toBe(0)
        expect(quitarFormatoMiles('   ')).toBe(0)
    })

    test('ignora el signo negativo porque \\D también lo descarta', () => {
        expect(quitarFormatoMiles('-500')).toBe(500)
    })

    test('extrae solo los dígitos de un string mixto', () => {
        expect(quitarFormatoMiles('$12.500,00')).toBe(1250000)
    })
})

describe('formatearPrecio', () => {
    test('formatea un valor positivo como moneda ARS sin decimales', () => {
        expect(formatearPrecio(180000)).toMatch(/\$\s?180\.000/)
    })

    test('formatea 0 como moneda', () => {
        expect(formatearPrecio(0)).toMatch(/\$\s?0/)
    })

    test('formatea valores negativos', () => {
        expect(formatearPrecio(-1500)).toMatch(/-\s?\$\s?1\.500/)
    })

    test('trunca decimales (maximumFractionDigits: 0)', () => {
        expect(formatearPrecio(1500.99)).not.toContain(',99')
    })

    test('formatea valores muy grandes', () => {
        expect(formatearPrecio(999999999)).toMatch(/999\.999\.999/)
    })
})

describe('formatearFecha', () => {
    test('convierte YYYY-MM-DD a DD/MM/YYYY', () => {
        expect(formatearFecha('2026-01-05')).toBe('05/01/2026')
    })

    test('funciona en el límite de fin de año', () => {
        expect(formatearFecha('2026-12-31')).toBe('31/12/2026')
    })
})

describe('formatearFechaHora', () => {
    test('incluye día, mes, año, hora y minuto', () => {
        const resultado = formatearFechaHora('2026-03-15T14:30:00.000Z')
        expect(resultado).toMatch(/\d{2}\/\d{2}\/2026/)
        expect(resultado).toMatch(/\d{2}:\d{2}/)
    })
})

describe('formatearFechaCorta', () => {
    test('incluye día, mes, hora y minuto pero no el año', () => {
        const resultado = formatearFechaCorta('2026-03-15T14:30:00.000Z')
        expect(resultado).not.toContain('2026')
        expect(resultado).toMatch(/\d{1,2}\/\d{1,2}/)
        expect(resultado).toMatch(/\d{2}:\d{2}/)
    })
})
