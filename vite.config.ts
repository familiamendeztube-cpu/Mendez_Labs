import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages serves a project site from /<repo>/. Netlify/Vercel/Bolt
  // serve from root — build those with `GHP=` unset (default '/').
  base: process.env.GHP === '1' ? '/Mendez_Labs/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    include: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ['recharts'],
          gsap: ['gsap'],
        },
      },
    },
  },
});
