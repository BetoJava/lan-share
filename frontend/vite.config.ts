import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
        target: 'http://localhost:3009',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3009',
        ws: true,
      },
    },
  },
})
