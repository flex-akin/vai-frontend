import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // ffmpeg.wasm ships worker files that the optimizer can't handle well.
    // Excluding it prevents Vite from trying to pre-bundle worker assets.
    exclude: ['@ffmpeg/ffmpeg'],
  },
  build: {
    commonjsOptions: {
      // sometimes FFmpeg packages ship CJS helpers; ensure Vite doesn't choke
      transformMixedEsModules: true,
    },
  },
  // Development-time proxy to avoid CORS when calling a local API server
  server: {
    proxy: {
      // forward /api requests to the local API backend
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    }
  }
})
