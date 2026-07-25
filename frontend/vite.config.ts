import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Doit rester aligné avec le PORT par défaut du backend (backend/src/index.ts).
// Surchargeable pour développer contre une instance lancée sur un autre port.
const backendPort = process.env.BACKEND_PORT || '3009'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    outDir: '../dist/static',
    emptyOutDir: true
  },
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
      },
      '/ws': {
        target: `ws://localhost:${backendPort}`,
        ws: true,
      },
    },
  },
})
