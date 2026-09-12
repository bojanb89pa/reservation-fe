import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { env } from '../config/environment';
import { tokenStorage } from './tokenStorage';
import { ApiError, normalizeAxiosError, type ApiErrorBody } from './apiError';

// WARNING: authAxiosClient is documented as unauthenticated (OAuth token exchange, register),
// but auth-service routes for profile pictures and user batch lookup require Bearer auth on the
// same host — this is that authenticated variant, mirroring resourceAxiosClient's interceptors — verify before merging
export const authenticatedAuthAxiosClient = axios.create({
  baseURL: env.authBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

authenticatedAuthAxiosClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  const lang = localStorage.getItem('lang') || navigator.language.split('-')[0] || 'en';
  config.headers.set('Accept-Language', lang);
  return config;
});

authenticatedAuthAxiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const normalized = normalizeAxiosError(error);
    if (normalized instanceof ApiError && normalized.isUnauthorized) {
      const hadToken = !!tokenStorage.getAccessToken();
      tokenStorage.clear();
      if (hadToken) {
        const params = new URLSearchParams({
          response_type: 'code',
          client_id: env.oauthClientId,
          redirect_uri: env.oauthRedirectUri,
          scope: 'openid profile read write',
        });
        window.location.href = `${env.authBaseUrl}/oauth2/authorize?${params.toString()}`;
      }
    }
    return Promise.reject(normalized);
  },
);
