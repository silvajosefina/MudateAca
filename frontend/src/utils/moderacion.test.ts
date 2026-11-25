import { etiquetaNotaModeracion } from './moderacion'
import type { EventoModeracion, TipoEventoModeracion } from '../types/publicacion'

function evento(tipo: TipoEventoModeracion): EventoModeracion {
    return { id: tipo, publicacionId: '1', tipo, nota: 'nota', fecha: '2026-11-25T10:00:00Z' }
}

describe('etiquetaNotaModeracion', () => {
    test('si la última observación fue automática, lo aclara', () => {
        expect(etiquetaNotaModeracion({ eventosModeracion: [evento('moderacion_automatica')] })).toBe('Revisión automática')
    })

    test('si la última observación la hizo un administrador, es su nota', () => {
        expect(
            etiquetaNotaModeracion({ eventosModeracion: [evento('solicitud_modificacion'), evento('moderacion_automatica')] }),
        ).toBe('Nota del administrador')
        expect(etiquetaNotaModeracion({ eventosModeracion: [evento('mantener_observada')] })).toBe('Nota del administrador')
    })

    test('ignora los eventos que no dejan la publicación observada', () => {
        expect(
            etiquetaNotaModeracion({ eventosModeracion: [evento('ocultamiento'), evento('moderacion_automatica')] }),
        ).toBe('Revisión automática')
    })

    test('sin historial usa la etiqueta del administrador', () => {
        expect(etiquetaNotaModeracion({})).toBe('Nota del administrador')
    })
})
