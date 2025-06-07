import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    exclude: ['dcraw'],
    include: ['heic-to']
  },
  build: {
    rollupOptions: {
      external: ['dcraw'],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          heic: ['heic-to']
        }
      }
    }
  },
  server: {
    hmr: true,
  }
}) 