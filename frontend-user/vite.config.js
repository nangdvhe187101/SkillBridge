import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('xlsx') || id.includes('pdfjs-dist') || id.includes('docx-preview')) {
              return 'vendor-docs';
            }
            if (id.includes('@microsoft/signalr')) {
              return 'vendor-signalr';
            }
          }
        },
      },
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5004',
        changeOrigin: true,
      },
    },
  },
})
