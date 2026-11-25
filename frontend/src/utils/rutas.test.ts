import { rutaDeInicio } from './rutas'

describe('rutaDeInicio', () => {
    test.each([
        ['interesado', '/explorar'],
        ['propietario', '/mis-publicaciones'],
        ['inmobiliaria', '/mis-publicaciones'],
        ['administrador', '/panel-administracion'],
    ] as const)('con sesión de %s arranca en %s', (rol, ruta) => {
        expect(rutaDeInicio(rol)).toBe(ruta)
    })

    test('sin sesión arranca en Explorar', () => {
        expect(rutaDeInicio()).toBe('/explorar')
    })
})
