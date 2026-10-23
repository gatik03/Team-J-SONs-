import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: '..',                       // read the single repo-root .env (VITE_API_BASE_URL, VITE_USE_MOCKS)
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://localhost:8080' } },
  build: { rollupOptions: { output: { manualChunks: { vendor: ['react', 'react-dom', 'react-router', '@tanstack/react-query'] } } } },
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], css: false },
});
