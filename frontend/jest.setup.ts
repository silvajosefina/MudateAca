import { TextDecoder, TextEncoder } from 'node:util'
import '@testing-library/jest-dom'

// jsdom no expone estas Web APIs globalmente; algunas dependencias
// (p. ej. react-router) las necesitan al cargarse.
Object.assign(globalThis, { TextEncoder, TextDecoder })
