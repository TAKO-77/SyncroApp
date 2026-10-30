import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // Web/PWA only: the Windows host copies just index.html and assets/, and lib/pwa.ts never registers the worker there.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Syncro',
        short_name: 'Syncro',
        description: 'Agenda, calendário, tarefas e finanças num só lugar.',
        lang: 'pt-PT',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0c0d0d',
        theme_color: '#0c0d0d',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          { urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com', handler: 'StaleWhileRevalidate', options: { cacheName: 'google-fonts-css' } },
          { urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com', handler: 'CacheFirst', options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }, cacheableResponse: { statuses: [0, 200] } } },
        ],
      },
    }),
  ],
  base: './',
})
