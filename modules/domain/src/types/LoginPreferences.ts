/**
 * Theme and language auth-service's server-rendered `/login` page reads from the
 * `theme` and `lang` cookies. There is no request/response body for this — the page
 * is plain HTML, not a REST endpoint — so these values are the only contract.
 */
export type LoginTheme = 'light' | 'dark';
export type LoginLanguage = 'en' | 'sr';

/** Matches the auth-service default used when the `theme` cookie is missing or invalid. */
export const DEFAULT_LOGIN_THEME: LoginTheme = 'light';
/** Matches the auth-service default used when the `lang` cookie is missing or invalid. */
export const DEFAULT_LOGIN_LANGUAGE: LoginLanguage = 'en';

export function toLoginTheme(value: string | null | undefined): LoginTheme {
  return value === 'dark' ? 'dark' : DEFAULT_LOGIN_THEME;
}

export function toLoginLanguage(value: string | null | undefined): LoginLanguage {
  return value === 'sr' ? 'sr' : DEFAULT_LOGIN_LANGUAGE;
}
