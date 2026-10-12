import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  FileUploadError,
  FileUploadErrorCode,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
  ValidationError,
  UnauthorizedError,
  ReservationSlotTakenError,
  ReservationErrorCode,
} from '@domain';

export interface ApiErrorBody {
  message?: string;
  error?: string;
  status?: number;
  code?: string;
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

/** `POST /api/files` or `POST /auth/users/files` — the multipart upload endpoints. */
const FILE_UPLOAD_PATH = /\/files\/?$/;
/** `PUT|DELETE /api/businesses/{id}/image` — claiming or clearing a business image. */
const BUSINESS_IMAGE_PATH = /\/businesses\/[^/]+\/image\/?$/;
// WARNING: assumed DELETE also warrants file-error mapping, mirroring BUSINESS_IMAGE_PATH below — verify before merging
/** `PUT|DELETE /auth/users/me/profile-picture` — claiming or clearing a profile picture. */
const PROFILE_PICTURE_PATH = /\/users\/me\/profile-picture\/?$/;
/** `GET|POST|PUT|PATCH|DELETE /auth/users/admin/accounts(/{id}...)` — admin user management routes. */
const ADMIN_USER_ACCOUNTS_PATH = /\/users\/admin\/accounts(\/.*)?$/;
/** `POST /resources/{resourceId}/reservations/{id}/cancel` — user-initiated reservation cancel. */
const RESERVATION_CANCEL_PATH = /\/reservations\/[^/]+\/cancel\/?$/;

/** `POST /resources/{resourceId}/reservations` — creating a reservation. */
const RESERVATION_CREATE_PATH = /\/resources\/[^/]+\/reservations\/?$/;
/** `POST /resources/{resourceId}/reservations/{id}/approve` — approving a PENDING reservation. */
const RESERVATION_APPROVE_PATH = /\/reservations\/[^/]+\/approve\/?$/;
/** `POST /client-applications/reservations` — reservation created through a client application. */
const CLIENT_APPLICATION_RESERVATION_PATH = /\/client-applications\/reservations\/?$/;
/** `PATCH /businesses/{id}/overlapping-pending-reservations` — owner-only setting. */
const OVERLAPPING_PENDING_PATH = /\/businesses\/[^/]+\/overlapping-pending-reservations\/?$/;

// WARNING: 401 on admin-user routes stays a generic ApiError (not UnauthorizedError) because authInterceptors.ts's refresh-retry only fires for `instanceof ApiError` — verify before merging
type AdminUserDomainError = NotFoundError | ConflictError | ValidationError | UnauthorizedError;

const ADMIN_USER_REASON_BY_STATUS: Readonly<
  Partial<Record<number, (message: string) => AdminUserDomainError>>
> = {
  400: (message) => new ValidationError(message),
  403: () => new UnauthorizedError(),
  404: () => new NotFoundError('User'),
  409: (message) => new ConflictError(message),
};

type ReservationCancelDomainError = NotFoundError | ConflictError | UnprocessableEntityError;

const RESERVATION_CANCEL_REASON_BY_STATUS: Readonly<
  Partial<Record<number, (message: string) => ReservationCancelDomainError>>
> = {
  404: () => new NotFoundError('Reservation'),
  409: (message) => new ConflictError(message),
  422: (message) => new UnprocessableEntityError(message),
};

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
  if (method === 'PUT' || method === 'DELETE') {
    return BUSINESS_IMAGE_PATH.test(path) || PROFILE_PICTURE_PATH.test(path);
  }
  return false;
}

function isAdminUserAccountsRequest(config: InternalAxiosRequestConfig | undefined): boolean {
  const path = (config?.url ?? '').split('?')[0];
  return ADMIN_USER_ACCOUNTS_PATH.test(path);
}

function isReservationCancelRequest(config: InternalAxiosRequestConfig | undefined): boolean {
  const path = (config?.url ?? '').split('?')[0];
  const method = (config?.method ?? '').toUpperCase();
  return method === 'POST' && RESERVATION_CANCEL_PATH.test(path);
}

function isSlotTakenReservationRequest(config: InternalAxiosRequestConfig | undefined): boolean {
  const path = (config?.url ?? '').split('?')[0];
  const method = (config?.method ?? '').toUpperCase();
  if (method !== 'POST') return false;
  return (
    RESERVATION_CREATE_PATH.test(path) ||
    RESERVATION_APPROVE_PATH.test(path) ||
    CLIENT_APPLICATION_RESERVATION_PATH.test(path)
  );
}

function isOverlappingPendingRequest(config: InternalAxiosRequestConfig | undefined): boolean {
  const path = (config?.url ?? '').split('?')[0];
  const method = (config?.method ?? '').toUpperCase();
  return method === 'PATCH' && OVERLAPPING_PENDING_PATH.test(path);
}

// WARNING: non-file, non-admin-user, non-reservation routes keep returning ApiError with a status, as before — verify before merging
export function normalizeAxiosError(
  error: AxiosError<ApiErrorBody>,
):
  | ApiError
  | FileUploadError
  | AdminUserDomainError
  | ReservationCancelDomainError
  | ReservationSlotTakenError {
  const status = error.response?.status ?? 0;
  const body = error.response?.data;
  const message = body?.message ?? body?.error ?? error.message ?? 'An unexpected error occurred';

  if (isFileRelatedRequest(error.config)) {
    const reason = FILE_UPLOAD_REASON_BY_STATUS[status];
    if (reason) return new FileUploadError(reason);
  }

  if (isAdminUserAccountsRequest(error.config)) {
    const toDomainError = ADMIN_USER_REASON_BY_STATUS[status];
    if (toDomainError) return toDomainError(message);
  }

  if (isReservationCancelRequest(error.config)) {
    const toDomainError = RESERVATION_CANCEL_REASON_BY_STATUS[status];
    if (toDomainError) return toDomainError(message);
  }

  if (
    status === 409 &&
    body?.code === ReservationErrorCode.RESERVATION_SLOT_TAKEN &&
    isSlotTakenReservationRequest(error.config)
  ) {
    return new ReservationSlotTakenError(message);
  }

  // WARNING: 409 on the owner-only setting route mapped to ConflictError (message only, `code` dropped) — verify before merging
  if (status === 409 && isOverlappingPendingRequest(error.config)) {
    return new ConflictError(message);
  }

  return new ApiError(message, status, body);
}
