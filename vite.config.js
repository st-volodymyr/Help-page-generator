import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Help-page-generator/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/index.[ext]',
      },
    },
  },
});
