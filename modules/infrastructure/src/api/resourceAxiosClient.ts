import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { env } from '../config/environment';
import { tokenStorage } from './tokenStorage';
import { normalizeAxiosError, type ApiErrorBody } from './apiError';

export const resourceAxiosClient = axios.create({
  baseURL: env.resourceBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

resourceAxiosClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  const lang = localStorage.getItem('lang') || navigator.language.split('-')[0] || 'en';
  config.headers.set('Accept-Language', lang);
  return config;
});

resourceAxiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const normalized = normalizeAxiosError(error);
    if (normalized.isUnauthorized) {
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
