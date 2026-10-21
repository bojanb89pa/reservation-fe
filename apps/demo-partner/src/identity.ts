import { createGoogleIdentity } from './googleIdentity';
import type { IdentityProvider } from './identityProvider';

/**
 * Bira izvor identiteta. Test grana postoji samo kad je `VITE_DEMO_IDENTITY=test`; u produkcijskom
 * build-u se izraz zamenjuje literalom, pa se grana (i dinamički import) uklanja. To proverava
 * `__tests__/bundle.test.ts`. Izraz mora ostati doslovno `import.meta.env.VITE_DEMO_IDENTITY`.
 */
export async function createIdentity(googleClientId: string): Promise<IdentityProvider> {
  if (import.meta.env.VITE_DEMO_IDENTITY === 'test') {
    const { createTestIdentity } = await import('./testIdentity');
    return createTestIdentity(window);
  }
  return createGoogleIdentity(googleClientId, window, document);
}
