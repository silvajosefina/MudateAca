module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    transform: {
        '^.+\\.([mc]?j|t)sx?$': 'babel-jest',
    },
    transformIgnorePatterns: ['/node_modules/(?!(react-router|lucide-react|cookie-es)/)'],
    moduleFileExtensions: ['tsx', 'ts', 'jsx', 'js', 'json'],
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    collectCoverageFrom: [
        'src/pages/Login.tsx',
        'src/pages/Registro.tsx',
        'src/pages/Explorar.tsx',
        'src/utils/formato.ts',
        'src/utils/filtrosExplorar.ts',
        'src/hooks/useDebouncedValue.ts',
    ],
    coverageThreshold: {
        'src/pages/Login.tsx': { branches: 80, functions: 80, lines: 80, statements: 80 },
        'src/pages/Registro.tsx': { branches: 80, functions: 80, lines: 80, statements: 80 },
        'src/pages/Explorar.tsx': { branches: 55, functions: 45, lines: 55, statements: 55 },
        'src/utils/formato.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
        'src/utils/filtrosExplorar.ts': { branches: 90, functions: 100, lines: 100, statements: 90 },
        'src/hooks/useDebouncedValue.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
    },
}
