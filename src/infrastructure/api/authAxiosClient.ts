import axios from 'axios';
import type { AxiosError } from 'axios';
import { env } from '../config/environment';
import { normalizeAxiosError, type ApiErrorBody } from './apiError';

export const authAxiosClient = axios.create({
  baseURL: env.authBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

authAxiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => Promise.reject(normalizeAxiosError(error)),
);
