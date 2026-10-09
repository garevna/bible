import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { VitePWA } from 'vite-plugin-pwa'

/** 'vuetify/components/VBtn', ... for every component exported by the installed Vuetify */
function vuetifyComponents() {
  const index = readFileSync(
    fileURLToPath(new URL('./node_modules/vuetify/lib/components/index.js', import.meta.url)),
    'utf8'
  )
  return Array.from(
    index.matchAll(/^export \* from "\.\/(\w+)\/index\.js"/gm),
    ([, name]) => `vuetify/components/${name}`
  )
}

// the site path: /bible/ on garevna.github.io, / on its own domain (BASE_PATH in CI)
export default defineConfig(({ command }) => ({
  base: command === 'build' ? process.env.BASE_PATH || '/' : '/',

  plugins: [
    vue(),
    vuetify({ autoImport: true }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'safari-pinned-tab.svg'],
      manifest: {
        name: 'Bible-ukr',
        short_name: 'Bible-ukr',
        theme_color: '#4caf50',
        background_color: '#4caf50',
        display: 'standalone',
        icons: [
          { src: 'android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'android-chrome-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // bible-*.json are 4-8 MB each and are stored in IndexedDB after the first load
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      }
    })
  ],

  // Pages are loaded lazily and Vuetify components are imported by vite-plugin-vuetify while
  // transforming them, so the dev server would discover them late and reload the page.
  // Prebundling them all up front avoids that.
  optimizeDeps: {
    entries: ['index.html', 'src/**/*.vue'],
    include: ['vuetify/directives', ...vuetifyComponents()]
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
}))
