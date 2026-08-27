import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';
import pkg from './package.json' with { type: 'json' };

const base = new URL(pkg.homepage).pathname + '/';

const FALLBACK_PAPER_COUNT = 4000;

// Count is baked in at build time from the sitemap CI already regenerates, so
// the landing page pays no runtime fetch for it.
function readPaperCount() {
  try {
    const sitemap = readFileSync(new URL('./public/sitemap.xml', import.meta.url), 'utf-8');
    const doiPages = (sitemap.match(/<loc>[^<]*\/doi\//g) || []).length;
    if (doiPages === 0) return FALLBACK_PAPER_COUNT;
    return Math.floor(doiPages / 100) * 100;
  } catch {
    return FALLBACK_PAPER_COUNT;
  }
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    solidPlugin(),
    {
      // `define` only reaches JS; the static copy in index.html needs its own pass.
      name: 'paper-count-html',
      transformIndexHtml(html: string) {
        return html.replaceAll(
          '__PAPER_COUNT__',
          readPaperCount().toLocaleString('en-US'),
        );
      },
    },
  ],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
  define: {
    __PAPER_COUNT__: JSON.stringify(readPaperCount()),
  },
  base,
});