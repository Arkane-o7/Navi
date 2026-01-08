import { defineConfig } from 'vite';

// Note: electron-forge plugin-vite handles the build configuration
// This config is only for additional customization
export default defineConfig({
  build: {
    lib: {
      entry: 'src/preload/index.ts',
      formats: ['cjs'],
      fileName: () => 'preload.js',
    },
    rollupOptions: {
      external: ['electron'],
    },
  },
});
