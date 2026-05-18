import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSession } from '@domain';
import { tokenStorage } from '../app/container';

interface AuthState {
  session: AuthSession | null;
  isAuthenticated: boolean;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      isAuthenticated: false,

      setSession: (session: AuthSession) => {
        tokenStorage.setAccessToken(session.accessToken);
        if (session.refreshToken) tokenStorage.setRefreshToken(session.refreshToken);
        set({ session, isAuthenticated: true });
      },

      clearSession: () => {
        tokenStorage.clear();
        set({ session: null, isAuthenticated: false });
      },
    }),
    {
      name: 'moj-termin-auth',
      partialize: (state) => ({ session: state.session, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
