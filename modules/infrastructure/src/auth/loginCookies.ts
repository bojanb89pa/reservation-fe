import type { LoginLanguage, LoginTheme } from '@domain';

/**
 * Sets the `theme`/`lang` cookies auth-service's server-rendered `/login` page reads,
 * so the OAuth redirect lands on a login page matching the app's current theme/language.
 */
export function setLoginCookiesBeforeAuthRedirect(theme: LoginTheme, language: LoginLanguage): void {
  // WARNING: cookie is only visible to auth-service if FE and auth-service share an origin or a
  // parent domain (e.g. Domain=.reserva.app) — not solved here, verify against deployment topology
  document.cookie = `theme=${theme}; path=/`;
  document.cookie = `lang=${language}; path=/`;
}
