import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Mudate Acá',
        short_name: 'Mudate Acá',
        description: 'Buscá, publicá y descubrí alquileres residenciales y temporarios.',
        lang: 'es-AR',
        start_url: '/explorar',
        scope: '/',
        display: 'standalone',
        background_color: '#FFFFFF',
        theme_color: '#1F4D3B',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Sin conexión abre la aplicación, pero los datos siempre se piden al servidor.
        // La API y el panel de Django nunca deben recibir el index.html del frontend.
        navigateFallbackDenylist: [/^\/api\//, /^\/admin\//, /^\/static\//],
      },
    }),
  ],
  server: {
    // En desarrollo, el frontend y la API comparten origen como en producción,
    // así las cookies httpOnly de la sesión funcionan igual.
    proxy: {
      '/api': 'http://localhost:8000',
      // Archivos subidos cuando el backend local no usa Cloudinary.
      '/media': 'http://localhost:8000',
    },
  },
})