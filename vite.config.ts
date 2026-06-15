import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    build(),
    devServer({
      adapter,
      entry: 'src/index.tsx'
    })
  ],
  build: {
    rollupOptions: {
      // Optional Puppeteer fallback — resolved only at deploy if installed.
      // Externalized so the build never fails when the dep is absent.
      external: ['@cloudflare/puppeteer']
    }
  }
})
