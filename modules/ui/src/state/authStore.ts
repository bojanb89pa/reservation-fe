import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSession } from '@domain';
import { tokenStorage } from '../app/container';

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
    },
  ),
);
