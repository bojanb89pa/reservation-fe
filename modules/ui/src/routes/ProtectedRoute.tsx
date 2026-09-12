import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toLoginTheme, toLoginLanguage } from '@domain';
import { useAuthStore } from '../state/authStore';
import { env, setLoginCookiesBeforeAuthRedirect } from '../app/container';

export function ProtectedRoute() {
  const { i18n } = useTranslation();
  const { isAuthenticated, isLoggingOut } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated && !isLoggingOut) {
      const theme = toLoginTheme(document.documentElement.getAttribute('data-theme'));
      const language = toLoginLanguage(i18n.language);
      setLoginCookiesBeforeAuthRedirect(theme, language);
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
