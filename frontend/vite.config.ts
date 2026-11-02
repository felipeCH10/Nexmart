import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'img',
  server: {
    proxy: {
      '/api': 'http://localhost:3050',
    },
  },
});
