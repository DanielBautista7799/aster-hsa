/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In development the Vite server forwards /api/* to the FastAPI backend, so the
// browser only ever talks to one origin (no CORS setup needed). In Docker,
// nginx does the same job (see nginx.conf).
const apiTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': apiTarget },
  },
  test: {
    environment: 'jsdom',
    globals: false,
  },
})
