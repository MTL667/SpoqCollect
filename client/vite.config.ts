import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/object-types(\?.*)?$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-object-types',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: /^\/api\/sessions\/[^/]+$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-session-detail',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: /^\/api\/sessions(\?.*)?$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-sessions-list',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
      manifest: {
        name: 'InventariSpoq',
        short_name: 'InventariSpoq',
        description: 'AI-powered fire safety inventory tool',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
