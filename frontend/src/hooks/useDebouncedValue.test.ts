import { act, renderHook } from '@testing-library/react'
import { useDebouncedValue } from './useDebouncedValue'

beforeEach(() => {
    jest.useFakeTimers()
})

afterEach(() => {
    jest.useRealTimers()
})

describe('useDebouncedValue', () => {
    test('devuelve el valor inicial de inmediato', () => {
        const { result } = renderHook(() => useDebouncedValue('inicial', 300))
        expect(result.current).toBe('inicial')
    })

    test('no actualiza el valor antes de que venza el delay', () => {
        const { result, rerender } = renderHook(({ valor }) => useDebouncedValue(valor, 300), {
            initialProps: { valor: 'a' },
        })

        rerender({ valor: 'b' })
        act(() => {
            jest.advanceTimersByTime(299)
        })

        expect(result.current).toBe('a')
    })

    test('actualiza el valor exactamente cuando se cumple el delay', () => {
        const { result, rerender } = renderHook(({ valor }) => useDebouncedValue(valor, 300), {
            initialProps: { valor: 'a' },
        })

        rerender({ valor: 'b' })
        act(() => {
            jest.advanceTimersByTime(300)
        })

        expect(result.current).toBe('b')
    })

    test('reinicia el temporizador si el valor cambia antes de que venza el delay anterior', () => {
        const { result, rerender } = renderHook(({ valor }) => useDebouncedValue(valor, 300), {
            initialProps: { valor: 'a' },
        })

        rerender({ valor: 'b' })
        act(() => {
            jest.advanceTimersByTime(200)
        })
        rerender({ valor: 'c' })
        act(() => {
            jest.advanceTimersByTime(200)
        })
        // Pasaron 400ms desde el primer cambio, pero el timer se reinició
        // con "c" hace solo 200ms: todavía no debería haber actualizado.
        expect(result.current).toBe('a')

        act(() => {
            jest.advanceTimersByTime(100)
        })
        expect(result.current).toBe('c')
    })

    test('con delay 0 actualiza en el siguiente tick', () => {
        const { result, rerender } = renderHook(({ valor }) => useDebouncedValue(valor, 0), {
            initialProps: { valor: 'a' },
        })

        rerender({ valor: 'b' })
        act(() => {
            jest.advanceTimersByTime(0)
        })

        expect(result.current).toBe('b')
    })

    test('limpia el temporizador pendiente al desmontar (sin errores ni actualizaciones fuera de tiempo)', () => {
        const { rerender, unmount } = renderHook(({ valor }) => useDebouncedValue(valor, 300), {
            initialProps: { valor: 'a' },
        })

        rerender({ valor: 'b' })
        unmount()

        expect(() => {
            act(() => {
                jest.advanceTimersByTime(300)
            })
        }).not.toThrow()
    })
})
