import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Help-page-generator/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
});
