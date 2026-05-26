import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '../state/authStore';
import { env } from '../app/container';

export function ProtectedRoute() {
  const { isAuthenticated, isLoggingOut } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated && !isLoggingOut) {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: env.oauthClientId,
        redirect_uri: env.oauthRedirectUri,
        scope: 'openid profile read write',
      });
      window.location.href = `${env.authBaseUrl}/oauth2/authorize?${params.toString()}`;
    }
  }, [isAuthenticated, isLoggingOut]);

  if (!isAuthenticated) {
    return null;
  }

  return <Outlet />;
}
