import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSession } from '@domain';
import { AUTH_SESSION_EXPIRED_EVENT, tokenStorage } from '../app/container';

interface AuthState {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoggingOut: boolean;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
  startLogout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      isAuthenticated: false,
      isLoggingOut: false,

      setSession: (session: AuthSession) => {
        tokenStorage.setAccessToken(session.accessToken);
        if (session.refreshToken) tokenStorage.setRefreshToken(session.refreshToken);
        if (session.idToken) tokenStorage.setIdToken(session.idToken);
        set({ session, isAuthenticated: true });
      },

      clearSession: () => {
        tokenStorage.clear();
        set({ session: null, isAuthenticated: false });
      },

      startLogout: () => {
        tokenStorage.clear();
        set({ session: null, isAuthenticated: false, isLoggingOut: true });
      },
    }),
    {
      name: 'reserva-auth',
      partialize: (state) => ({ session: state.session, isAuthenticated: state.isAuthenticated }),
      // A persisted "authenticated" flag without a token is stale (e.g. session expired);
      // trusting it fires protected requests that 401 and loop through /oauth2/authorize.
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<AuthState> | undefined) };
        if (merged.isAuthenticated && !tokenStorage.getAccessToken()) {
          return { ...merged, session: null, isAuthenticated: false };
        }
        return merged;
      },
    },
  ),
);

// Persist writes synchronously, so the cleared state is stored before the expiry redirect.
if (typeof window !== 'undefined') {
  window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, () => {
    useAuthStore.getState().clearSession();
  });
}
