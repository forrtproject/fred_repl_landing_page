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

// Anything Vite owns at the origin root and must not be bounced into the base.
const PASSTHROUGH = /^\/(@|node_modules\/|__|\.well-known\/)/;

// Without this, hitting http://localhost:3000/ (or the browser's automatic
// /favicon.ico probe from there) answers with Vite's "did you mean to visit
// /flora-replication-atlas/" notice instead of the site. Redirect into the base
// so any root-relative URL just works in dev and preview.
function redirectRootToBase() {
  const middleware = (req: any, res: any, next: () => void) => {
    const url: string = req.url || '/';
    if (url.startsWith(base) || PASSTHROUGH.test(url)) return next();
    res.statusCode = 302;
    res.setHeader('Location', base.replace(/\/$/, '') + url);
    res.end();
  };
  return {
    name: 'redirect-root-to-base',
    configureServer(server: any) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server: any) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    solidPlugin(),
    redirectRootToBase(),
    {
      // `define` only reaches JS, so the crawlable copy in index.html needs its
      // own pass for the same token.
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
    // Fail loudly rather than drifting to 3001 and leaving a stale tab on 3000.
    strictPort: true,
    open: base,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    target: 'esnext',
  },
  define: {
    __PAPER_COUNT__: JSON.stringify(readPaperCount()),
  },
  base,
});