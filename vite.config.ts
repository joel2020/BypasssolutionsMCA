import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    cors: {
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
