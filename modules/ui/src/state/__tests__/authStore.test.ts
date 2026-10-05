import { describe, it, expect, vi, beforeEach } from 'vitest';

const EXPIRED = 'auth:session-expired';
const tokens = { access: null as string | null };

vi.mock('../../app/container', () => ({
  AUTH_SESSION_EXPIRED_EVENT: 'auth:session-expired',
  tokenStorage: {
    getAccessToken: () => tokens.access,
    setAccessToken: vi.fn(),
    setRefreshToken: vi.fn(),
    setIdToken: vi.fn(),
    clear: vi.fn(() => {
      tokens.access = null;
    }),
  },
}));

const staleSession = { accessToken: 'a', refreshToken: 'r' };

function persist(isAuthenticated: boolean) {
  localStorage.setItem(
    'reserva-auth',
    JSON.stringify({
      state: { session: isAuthenticated ? staleSession : null, isAuthenticated },
      version: 0,
    }),
  );
}

async function loadStore() {
  vi.resetModules();
  return (await import('../authStore')).useAuthStore;
}

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    tokens.access = null;
  });

  it('resets a persisted authenticated state when no access token exists', async () => {
    persist(true);
    const store = await loadStore();
    expect(store.getState().isAuthenticated).toBe(false);
    expect(store.getState().session).toBeNull();
  });

  it('keeps a persisted authenticated state when the access token exists', async () => {
    persist(true);
    tokens.access = 'a';
    const store = await loadStore();
    expect(store.getState().isAuthenticated).toBe(true);
    expect(store.getState().session).toEqual(staleSession);
  });

  it('clears the session when the session-expired event is dispatched', async () => {
    persist(true);
    tokens.access = 'a';
    const store = await loadStore();
    expect(store.getState().isAuthenticated).toBe(true);

    window.dispatchEvent(new CustomEvent(EXPIRED));

    expect(store.getState().isAuthenticated).toBe(false);
    expect(store.getState().session).toBeNull();
    const persisted = JSON.parse(localStorage.getItem('reserva-auth') ?? '{}');
    expect(persisted.state.isAuthenticated).toBe(false);
  });
});
