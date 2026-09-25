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
      includeAssets: [
        'apple-touch-icon.png',
        'apple-splash-750x1334.png', 'apple-splash-828x1792.png',
        'apple-splash-1170x2532.png', 'apple-splash-1179x2556.png',
        'apple-splash-1284x2778.png', 'apple-splash-1290x2778.png',
        'apple-splash-2048x2732.png',
      ],
      manifest: {
        name: 'PatentePro',
        short_name: 'PatentePro',
        description: 'Driving school instructor management',
        theme_color: '#1a3a5c',
        // Branded launch screen: Android generates its splash from this
        // color + the icon; iOS uses the apple-splash-*.png startup images.
        background_color: '#1a3a5c',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
});