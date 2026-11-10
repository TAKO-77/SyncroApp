import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { version } from './package.json'

// Build-only: pins the one inline script (the saved theme) by hash, so the policy needs no 'unsafe-inline' for scripts.
function contentSecurityPolicy(supabaseUrl: string): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml(html) {
      const inline = [...html.matchAll(/<script(?![^>]*\ssrc\s*=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`)
      let api = ''
      try { const u = new URL(supabaseUrl); api = `${u.origin} wss://${u.host}` } catch { /* not configured */ }
      const policy = [
        "default-src 'self'",
        `script-src 'self' ${inline.join(' ')}`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob:",
        `connect-src 'self' ${api}`.trim(),
        "worker-src 'self'",
        "manifest-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')
      const anchor = '<meta charset="utf-8">'
      if (!html.includes(anchor)) throw new Error('index.html has no charset meta to place the Content-Security-Policy after')
      return html.replace(anchor, `${anchor}
<meta http-equiv="Content-Security-Policy" content="${policy}">`)
    },
  }
}

export default defineConfig(({ mode }) => ({
  // Web builds ship on every push, so the build time tells them apart between releases.
  define: { __APP_VERSION__: JSON.stringify(version), __APP_BUILD__: JSON.stringify(new Date().toISOString()) },
  plugins: [
    react(),
    contentSecurityPolicy(loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '').VITE_SUPABASE_URL ?? ''),
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
        // Only used by link previews, never by the app.
        globIgnores: ['og-image.png'],
        navigateFallback: 'index.html',
        importScripts: ['push-sw.js'],
        runtimeCaching: [
          { urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com', handler: 'StaleWhileRevalidate', options: { cacheName: 'google-fonts-css' } },
          { urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com', handler: 'CacheFirst', options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }, cacheableResponse: { statuses: [0, 200] } } },
        ],
      },
    }),
  ],
  base: './',
}))
