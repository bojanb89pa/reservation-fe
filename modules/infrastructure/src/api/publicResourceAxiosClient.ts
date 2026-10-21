import axios from 'axios';
import type { AxiosError } from 'axios';
import { env } from '../config/environment';
import { normalizeAxiosError, type ApiErrorBody } from './apiError';

/**
 * resource-service client WITHOUT the Reserva user auth interceptors: no stored token, no
 * refresh, no session-expired redirect. Used by the widget, which sends either no
 * Authorization header or an explicit partner access token per request.
 */
export const publicResourceAxiosClient = axios.create({
  baseURL: env.resourceBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

publicResourceAxiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => Promise.reject(normalizeAxiosError(error)),
);
