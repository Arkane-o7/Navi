import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname),
  resolve: {
    dedupe: ['react', 'react-dom', 'zustand'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'zustand/middleware'],
  },
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'settings.html'),
    },
  },
});
