import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { AuthSession } from '@domain';
import { toLoginLanguage, toLoginTheme } from '@domain';
import { env } from '../config/environment';
import { AuthApiRepository } from '../repositories/AuthApiRepository';
import { setLoginCookiesBeforeAuthRedirect } from '../auth/loginCookies';
import { authAxiosClient } from './authAxiosClient';
import { ApiError, normalizeAxiosError, type ApiErrorBody } from './apiError';
import { emitSessionExpired, emitSessionRefreshed } from './authEvents';
import { tokenStorage } from './tokenStorage';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Set on the retried request after a refresh, so a second 401 doesn't trigger another refresh attempt. */
    skipAuthRefresh?: boolean;
  }
  interface InternalAxiosRequestConfig {
    skipAuthRefresh?: boolean;
  }
}

// WARNING: assumed 10s leeway before proactively refreshing a near-expiry access token — tune against real auth-service TTL — verify before merging
const EXPIRY_LEEWAY_MS = 10_000;

// Shared across every client that calls attachAuthInterceptors, so concurrent 401s/near-expiry
// requests on different hosts coalesce into a single call to the auth server.
let refreshPromise: Promise<AuthSession> | null = null;

function decodeJwtExpiryMs(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isAccessTokenExpiring(token: string): boolean {
  const expiryMs = decodeJwtExpiryMs(token);
  if (expiryMs === null) return false;
  return expiryMs - Date.now() <= EXPIRY_LEEWAY_MS;
}

function persistSession(session: AuthSession): void {
  tokenStorage.setAccessToken(session.accessToken);
  if (session.refreshToken) tokenStorage.setRefreshToken(session.refreshToken);
  if (session.idToken) tokenStorage.setIdToken(session.idToken);
}

async function refreshSession(): Promise<AuthSession> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) throw new ApiError('No refresh token available', 401);

  if (!refreshPromise) {
    const authRepository = new AuthApiRepository(authAxiosClient);
    refreshPromise = authRepository.refreshToken(refreshToken).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function redirectToAuthorize(): void {
  const theme = toLoginTheme(localStorage.getItem('theme'));
  const language = toLoginLanguage(localStorage.getItem('lang'));
  setLoginCookiesBeforeAuthRedirect(theme, language);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.oauthClientId,
    redirect_uri: env.oauthRedirectUri,
    scope: 'openid profile read write',
  });
  window.location.href = `${env.authBaseUrl}/oauth2/authorize?${params.toString()}`;
}

// WARNING: still hard-redirects straight to the OAuth authorize screen; a UI-layer ticket should
// listen for AUTH_SESSION_EXPIRED_EVENT / tokenStorage.consumeSessionExpiredFlag() to show an
// in-app "session expired" message before/around this redirect — verify before merging
function handleSessionExpired(): void {
  tokenStorage.clear();
  tokenStorage.markSessionExpired();
  emitSessionExpired();
  redirectToAuthorize();
}

function attachRequestInterceptor(client: AxiosInstance): void {
  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    let token = tokenStorage.getAccessToken();
    if (token && !config.skipAuthRefresh && isAccessTokenExpiring(token)) {
      try {
        const session = await refreshSession();
        persistSession(session);
        emitSessionRefreshed(session);
        token = session.accessToken;
      } catch {
        handleSessionExpired();
        throw new ApiError('Session expired', 401);
      }
    }
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    const lang = localStorage.getItem('lang') || navigator.language.split('-')[0] || 'en';
    config.headers.set('Accept-Language', lang);
    return config;
  });
}

function attachResponseInterceptor(client: AxiosInstance): void {
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiErrorBody>) => {
      const normalized = normalizeAxiosError(error);
      const config = error.config;

      const canRetryWithRefresh =
        normalized instanceof ApiError &&
        normalized.isUnauthorized &&
        !!config &&
        !config.skipAuthRefresh &&
        !!tokenStorage.getRefreshToken();

      if (canRetryWithRefresh && config) {
        try {
          const session = await refreshSession();
          persistSession(session);
          emitSessionRefreshed(session);
          config.skipAuthRefresh = true;
          config.headers.set('Authorization', `Bearer ${session.accessToken}`);
          return client(config);
        } catch {
          handleSessionExpired();
          return Promise.reject(normalized);
        }
      }

      if (normalized instanceof ApiError && normalized.isUnauthorized) {
        handleSessionExpired();
      }
      return Promise.reject(normalized);
    },
  );
}

/** Wires the shared bearer/refresh/401 handling onto an authenticated axios instance. */
export function attachAuthInterceptors(client: AxiosInstance): void {
  attachRequestInterceptor(client);
  attachResponseInterceptor(client);
}
