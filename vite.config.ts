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
      // forward /transcribe requests to the local transcription backend
      '/transcribe': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      },
      // add other API proxies here if needed, e.g. '/api': { target: 'http://localhost:4000' }
    }
  }
})
