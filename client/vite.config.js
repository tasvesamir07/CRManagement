import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'screenshot-desktop.png', 'screenshot-mobile.png'],
      manifest: {
        name: 'CR Announcement Dashboard',
        short_name: 'CR Announce',
        description: 'Broadcast class notices to WhatsApp and Telegram',
        theme_color: '#3ecf8e',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        id: '/',
        categories: ['education', 'productivity', 'utilities'],
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ],
        screenshots: [
          {
            src: '/screenshot-desktop.png',
            sizes: '1024x830',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Desktop App View'
          },
          {
            src: '/screenshot-mobile.png',
            sizes: '456x847',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Mobile App View'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            // Critical read endpoints: CacheFirst with 24h TTL
            urlPattern: /\/api\/(courses|platforms|templates)(\?.*)?$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache-data',
              expiration: { maxEntries: 30, maxAgeSeconds: 86400 } // 24h
            }
          },
          {
            // Auth and other endpoints: NetworkFirst with short cache
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache-general',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
