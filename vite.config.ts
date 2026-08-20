import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages project sites live at /<repo>/, which would break absolute asset
// paths. The deploy workflow sets BASE_PATH; everything else defaults to root.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'EchoBloom',
        short_name: 'EchoBloom',
        // must match the served path so the installed app opens at the right place
        start_url: base,
        scope: base,
        description:
          'A communication companion for gestalt language learners — real voices, whole phrases, letters and numbers in four languages.',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#f8f5ed',
        theme_color: '#6554bf',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      // serve the manifest + SW in dev too, so the tablet-over-wifi flow
      // gets fullscreen install and offline behavior during development
      devOptions: { enabled: true },
    }),
  ],
  // host: true lets the tablet load the dev server over home wifi
  server: { host: true },
})
