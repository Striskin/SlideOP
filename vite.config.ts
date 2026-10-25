import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const headers = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, headers },
  preview: { headers },
  build: { chunkSizeWarningLimit: 1200 },
  optimizeDeps: { exclude: ['@imgly/background-removal'] },
});
