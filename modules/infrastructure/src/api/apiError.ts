import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { FileUploadError, FileUploadErrorCode } from '@domain';

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

/** `POST /api/files` — the multipart upload endpoint. */
const FILE_UPLOAD_PATH = /\/files\/?$/;
/** `PUT|DELETE /api/businesses/{id}/image` — claiming or clearing a business image. */
const BUSINESS_IMAGE_PATH = /\/businesses\/[^/]+\/image\/?$/;

/**
 * Status-to-reason table for file routes only. The backend body carries a raw
 * key such as `error.file.too_large`, so the status is what we branch on.
 */
const FILE_UPLOAD_REASON_BY_STATUS: Readonly<Partial<Record<number, FileUploadErrorCode>>> = {
  400: FileUploadErrorCode.CONTENT_TYPE_UNSUPPORTED,
  403: FileUploadErrorCode.UPLOAD_FORBIDDEN,
  404: FileUploadErrorCode.UPLOAD_NOT_FOUND,
  413: FileUploadErrorCode.FILE_TOO_LARGE,
};

function isFileRelatedRequest(config: InternalAxiosRequestConfig | undefined): boolean {
  const path = (config?.url ?? '').split('?')[0];
  const method = (config?.method ?? '').toUpperCase();
  if (method === 'POST') return FILE_UPLOAD_PATH.test(path);
  if (method === 'PUT' || method === 'DELETE') return BUSINESS_IMAGE_PATH.test(path);
  return false;
}

// WARNING: non-file routes keep returning ApiError with a status, as before — verify before merging
export function normalizeAxiosError(error: AxiosError<ApiErrorBody>): ApiError | FileUploadError {
  const status = error.response?.status ?? 0;
  const body = error.response?.data;
  const message = body?.message ?? body?.error ?? error.message ?? 'An unexpected error occurred';

  if (isFileRelatedRequest(error.config)) {
    const reason = FILE_UPLOAD_REASON_BY_STATUS[status];
    if (reason) return new FileUploadError(reason);
  }

  return new ApiError(message, status, body);
}
