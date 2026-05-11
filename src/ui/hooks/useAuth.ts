import { useAuthStore } from '../state/authStore';
import { authApiRepository } from '../app/container';
import { env } from '@infrastructure/config/environment';

export function useAuth() {
  const { session, isAuthenticated, setSession, clearSession } = useAuthStore();

  const initiateLogin = () => {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: env.oauthClientId,
      redirect_uri: env.oauthRedirectUri,
      scope: 'openid profile read write',
    });
    window.location.href = `${env.authBaseUrl}/oauth2/authorize?${params.toString()}`;
  };

  const handleCallback = async (code: string) => {
    const session = await authApiRepository.exchangeCode(code);
    setSession(session);
    return session;
  };

  const logout = () => {
    clearSession();
    window.location.href = '/';
  };

  return { session, isAuthenticated, initiateLogin, handleCallback, logout };
}
