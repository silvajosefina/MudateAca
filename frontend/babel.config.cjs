function stripImportMeta() {
    return {
        visitor: {
            MetaProperty(path) {
                if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
                    path.replaceWithSourceString('({})')
                }
            },
        },
    }
}

module.exports = {
    presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript',
    ],
    plugins: [stripImportMeta],
}
