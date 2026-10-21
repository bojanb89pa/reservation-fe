import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

// Samostalna aplikacija: ne uvozi nijedan `@fe/*` paket (vidi root eslint.config.js) i ne ulazi
// u root `yarn build`. Port 5175 je na `frame-ancestors` listi widget-a (vite preview / nginx).

/** /privacy i /terms servira privacy.html / terms.html (dev i preview; nginx ima `$uri.html`). */
function legalPages(): Plugin {
  const rewrite = (url: string | undefined) => {
    const path = url?.split('?')[0];
    return path === '/privacy' || path === '/terms' ? `${path}.html` : url;
  };
  const middleware = (
    req: { url?: string },
    _res: unknown,
    next: () => void,
  ): void => {
    req.url = rewrite(req.url);
    next();
  };
  return {
    name: 'demo-partner-legal-pages',
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  };
}

export default defineConfig({
  plugins: [legalPages()],
  server: { port: 5175, strictPort: true },
  preview: { port: 5175, strictPort: true },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        privacy: resolve(import.meta.dirname, 'privacy.html'),
        terms: resolve(import.meta.dirname, 'terms.html'),
      },
    },
  },
});
