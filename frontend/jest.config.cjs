module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    transform: {
        '^.+\\.(t|j)sx?$': 'babel-jest',
    },
    // react-router y lucide-react se distribuyen como ESM puro: hay que
    // transformarlos igual que al código propio en vez de ignorarlos.
    transformIgnorePatterns: ['/node_modules/(?!(react-router|lucide-react)/)'],
    moduleFileExtensions: ['tsx', 'ts', 'jsx', 'js', 'json'],
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    collectCoverageFrom: [
        'src/pages/Login.tsx',
        'src/pages/Registro.tsx',
        'src/pages/Explorar.tsx',
    ],
    // Login y Registro están cubiertos de punta a punta (80%, como pide la
    // cátedra). Explorar.tsx tiene mucha superficie fuera de "filtros" (banner,
    // guardar búsqueda, paginación, toggle de vista) que no estaba en el
    // alcance pedido, así que su umbral refleja solo lo que se testeó.
    coverageThreshold: {
        'src/pages/Login.tsx': { branches: 80, functions: 80, lines: 80, statements: 80 },
        'src/pages/Registro.tsx': { branches: 80, functions: 80, lines: 80, statements: 80 },
        'src/pages/Explorar.tsx': { branches: 40, functions: 45, lines: 60, statements: 55 },
    },
}
