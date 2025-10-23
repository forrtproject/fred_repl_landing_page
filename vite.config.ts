import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';
console.log('BUILD_ENV:',  String(process.env.BUILD_ENV)?.trim() === 'gh-pages' ? '/fred_repl_landing_page/' : '/');
export default defineConfig({
  plugins: [
    tailwindcss(),
    solidPlugin(),
  ],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
  base: '/fred_repl_landing_page/',
});