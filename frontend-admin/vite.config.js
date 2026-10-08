import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api/storage': {
        target: 'http://localhost:5004',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
    },
  },
});
