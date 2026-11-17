import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'REACT_APP_'],
  server: { host: 'localhost', port: 3000, strictPort: true },
  preview: { host: 'localhost', port: 3000, strictPort: true },
  build: { outDir: 'build' },
  test: {
    exclude: ['e2e/**', 'node_modules/**'],
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost:3000' } },
  },
});
