import { defineConfig } from 'vite';
import { builtinModules } from 'module';

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
      external: [
        'electron',
        // Externalize all Node.js built-in modules
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
      ],
    },
  },
});
