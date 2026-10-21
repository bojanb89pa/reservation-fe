import { createListeners, decodeJwtClaims, type IdentityProvider } from './identityProvider';

const GIS_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleId {
  initialize(config: { client_id: string; callback: (r: { credential: string }) => void }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
  disableAutoSelect(): void;
}
type GoogleWindow = Window & { google?: { accounts?: { id?: GoogleId } } };

/**
 * Google Identity Services, samo u browser-u: ID token ostaje u memoriji (bez kolačića i bez
 * backend-a). Posle reload-a stranice korisnik se prijavljuje ponovo.
 */
export function createGoogleIdentity(
  clientId: string,
  win: Window,
  doc: Document,
): IdentityProvider {
  const { subscribe, notify } = createListeners();
  let token: string | null = null;
  let gis: Promise<GoogleId> | null = null;

  function loadGis(): Promise<GoogleId> {
    gis ??= new Promise<GoogleId>((resolve, reject) => {
      const existing = (win as GoogleWindow).google?.accounts?.id;
      if (existing) return resolve(existing);
      const script = doc.createElement('script');
      script.src = GIS_SRC;
      script.async = true;
      script.onload = () => {
        const id = (win as GoogleWindow).google?.accounts?.id;
        if (id) resolve(id);
        else reject(new Error('Google Identity Services nije dostupan'));
      };
      script.onerror = () => reject(new Error('Google Identity Services se nije učitao'));
      doc.head.append(script);
    }).then((id) => {
      id.initialize({
        client_id: clientId,
        callback: ({ credential }) => {
          token = credential;
          notify();
        },
      });
      return id;
    });
    return gis;
  }

  function currentToken(): string | null {
    if (!token) return null;
    const exp = decodeJwtClaims(token)?.exp;
    // Istekao Google token Reserva ionako odbija; tretiraj korisnika kao gosta.
    if (exp !== undefined && exp * 1000 <= Date.now()) return null;
    return token;
  }

  return {
    getIdentityToken: currentToken,
    getUserLabel() {
      const t = currentToken();
      if (!t) return null;
      const claims = decodeJwtClaims(t);
      return claims?.name ?? claims?.email ?? 'Prijavljen';
    },
    renderLoginButton(container) {
      loadGis()
        .then((id) =>
          id.renderButton(container, { type: 'standard', theme: 'outline', text: 'signin_with' }),
        )
        .catch((error) => console.error('[demo-partner] Google prijava nije dostupna', error));
    },
    signOut() {
      token = null;
      void loadGis()
        .then((id) => id.disableAutoSelect())
        .catch(() => undefined);
      notify();
    },
    subscribe,
  };
}
