/** Izvor ID tokena partnerovog korisnika (Google ili test režim). */
export interface IdentityProvider {
  /** OIDC ID token ili `null` za gosta; prosleđuje se widget-u kroz `getIdentityToken`. */
  getIdentityToken(): string | null;
  /** Prikazno ime prijavljenog korisnika (`null` ako je gost). */
  getUserLabel(): string | null;
  /** Crta kontrolu za prijavu (Google dugme ili test dugme). */
  renderLoginButton(container: HTMLElement): void;
  signOut(): void;
  /** Poziva se posle svakog logina i logouta; vraća funkciju za odjavu slušaoca. */
  subscribe(listener: () => void): () => void;
}

export interface JwtClaims {
  name?: string;
  email?: string;
  exp?: number;
}

/** Čita payload JWT-a bez provere potpisa (samo za prikaz i istek; proveru radi Reserva). */
export function decodeJwtClaims(token: string): JwtClaims | null {
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    const claims: unknown = JSON.parse(json);
    return typeof claims === 'object' && claims !== null ? (claims as JwtClaims) : null;
  } catch {
    return null;
  }
}

export function createListeners() {
  const listeners = new Set<() => void>();
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    notify() {
      listeners.forEach((l) => l());
    },
  };
}
