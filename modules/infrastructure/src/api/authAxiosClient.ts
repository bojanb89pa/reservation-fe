import axios from 'axios';
import type { AxiosError } from 'axios';
import { env } from '../config/environment';
import { normalizeAxiosError, type ApiErrorBody } from './apiError';

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuthInterceptor?: boolean;
  }
  interface InternalAxiosRequestConfig {
    skipAuthInterceptor?: boolean;
  }
}

export const authAxiosClient = axios.create({
  baseURL: env.authBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

authAxiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.config?.skipAuthInterceptor) return Promise.reject(error);
    return Promise.reject(normalizeAxiosError(error));
  },
);
