import { useAuthStore } from '../state/authStore';
import { authApiRepository, env, tokenStorage } from '../app/container';

export function useIsAdmin(): boolean {
  const session = useAuthStore((s) => s.session);
  if (!session) return false;
  try {
    const payload = JSON.parse(atob(session.accessToken.split('.')[1])) as Record<string, unknown>;
    const roles = (payload['roles'] ?? payload['authorities'] ?? []) as string[];
    return roles.includes('ROLE_ADMIN');
  } catch {
    return false;
  }
}

export function useAuth() {
  const { session, isAuthenticated, setSession, startLogout } = useAuthStore();

  const initiateLogin = () => {
    sessionStorage.setItem('auth_return_to', window.location.pathname);
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
    const idToken = tokenStorage.getIdToken();
    startLogout();
    const params = new URLSearchParams({ post_logout_redirect_uri: window.location.origin });
    if (idToken) params.set('id_token_hint', idToken);
    window.location.href = `${env.authBaseUrl}/connect/logout?${params.toString()}`;
  };

  return { session, isAuthenticated, initiateLogin, handleCallback, logout };
}
