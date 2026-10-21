import { createListeners, decodeJwtClaims, type IdentityProvider } from './identityProvider';

/**
 * DEMO_TEST_IDENTITY_MARKER — string po kome `bundle.test.ts` proverava da ovaj fajl nije u
 * produkcijskom bundle-u.
 *
 * Test režim (`VITE_DEMO_IDENTITY=test`): ID token od test OIDC izdavaoca stiže iz
 * `window.__DEMO_ID_TOKEN__` ili query parametra `?idToken=`. Vidi README.md.
 */
export type TestWindow = Window & { __DEMO_ID_TOKEN__?: string | null };

export function createTestIdentity(win: TestWindow): IdentityProvider {
  const { subscribe, notify } = createListeners();

  const source = (): string | null => {
    const fromWindow = win.__DEMO_ID_TOKEN__;
    if (typeof fromWindow === 'string' && fromWindow !== '') return fromWindow;
    return new URLSearchParams(win.location.search).get('idToken') || null;
  };

  // Prijavljen od starta ako je token već dostupan (Playwright ga postavi pre učitavanja).
  let signedIn = source() !== null;

  const token = () => (signedIn ? source() : null);

  return {
    getIdentityToken: token,
    getUserLabel() {
      const t = token();
      if (!t) return null;
      const claims = decodeJwtClaims(t);
      return claims?.name ?? claims?.email ?? 'Test korisnik';
    },
    renderLoginButton(container) {
      const button = container.ownerDocument.createElement('button');
      button.type = 'button';
      button.textContent = 'Prijava (test)';
      button.addEventListener('click', () => {
        signedIn = true;
        notify();
      });
      container.replaceChildren(button);
    },
    signOut() {
      signedIn = false;
      notify();
    },
    subscribe,
  };
}
