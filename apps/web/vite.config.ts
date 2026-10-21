import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Isto što radi nginx.conf u image-u: `/widget/` sme da ugrade samo origin-i iz
// WIDGET_FRAME_ANCESTORS (runtime env, nije VITE_), ostatak FE-a ostaje na 'self'.
// Služi `yarn preview` (E2E) i `yarn dev`.
const DEFAULT_WIDGET_FRAME_ANCESTORS =
  'https://demo-business.bojanlab.com http://localhost:3000 http://localhost:5175 http://127.0.0.1:5175';

function frameAncestorsPlugin(): Plugin {
  const widgetAncestors = process.env['WIDGET_FRAME_ANCESTORS'] || DEFAULT_WIDGET_FRAME_ANCESTORS;
  const middleware = (
    req: { url?: string },
    res: { setHeader(name: string, value: string): void },
    next: () => void,
  ) => {
    const isWidget = (req.url ?? '').startsWith('/widget/');
    res.setHeader(
      'Content-Security-Policy',
      `frame-ancestors ${isWidget ? widgetAncestors : "'self'"}`,
    );
    next();
  };
  return {
    name: 'reserva-frame-ancestors',
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  };
}

// Paketi iz modules/ (`@fe/*`) se razrešavaju kao workspace paketi iz
// izvornog koda (`exports` → src/index.ts), bez aliasa. `.env` ostaje u
// root-u repoa, pored `.env.example`.
export default defineConfig({
  plugins: [react(), frameAncestorsPlugin()],
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
});
