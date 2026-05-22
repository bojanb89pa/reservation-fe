import type { AxiosError } from 'axios';

export interface ApiErrorBody {
  message?: string;
  error?: string;
  status?: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: ApiErrorBody,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

export function normalizeAxiosError(error: AxiosError<ApiErrorBody>): ApiError {
  const status = error.response?.status ?? 0;
  const body = error.response?.data;
  const message = body?.message ?? body?.error ?? error.message ?? 'An unexpected error occurred';
  return new ApiError(message, status, body);
}
