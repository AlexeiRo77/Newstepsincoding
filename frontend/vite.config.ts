/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev server forwards /api to the backend, so the browser sees one origin and the session
// cookie needs no CORS. API_URL is set by docker-compose.yml; the default suits `npm run dev`
// next to a backend on its default port.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // The compose service name, so the full gate's smoke test can reach the dev server in-stack.
    allowedHosts: ['frontend'],
    proxy: { '/api': process.env.API_URL ?? 'http://localhost:8000' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
  },
})
