import { useTranslation } from 'react-i18next';

/** i18next treats ':' as a namespace separator, so OAuth scopes map to plain keys. */
const OAUTH_SCOPE_LABEL_KEYS: Record<string, string> = {
  'reservation:create': 'oauthScopes.reservationCreate',
  'reservation:read:own': 'oauthScopes.reservationReadOwn',
};

export function useOAuthScopeLabel() {
  const { t } = useTranslation();
  return (scope: string) => {
    const key = OAUTH_SCOPE_LABEL_KEYS[scope];
    return key ? `${t(key)} (${scope})` : scope;
  };
}
