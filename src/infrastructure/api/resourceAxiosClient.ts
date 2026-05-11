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
  return config;
});

resourceAxiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const normalized = normalizeAxiosError(error);
    if (normalized.isUnauthorized) {
      tokenStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(normalized);
  },
);
