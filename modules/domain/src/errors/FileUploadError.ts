import { DomainError } from './DomainError';

export enum FileUploadErrorCode {
  FILE_EMPTY = 'error.file.empty',
  CONTENT_TYPE_UNSUPPORTED = 'error.file.content_type_unsupported',
  FILE_TOO_LARGE = 'error.file.too_large',
  UPLOAD_NOT_FOUND = 'error.file.upload_not_found',
  UPLOAD_FORBIDDEN = 'error.file.upload_forbidden',
}

/**
 * A rejected upload, raised either by client-side validation or by translating
 * the backend status. `reason` is the stable key to branch on; the raw backend
 * message is never shown to the user.
 */
export class FileUploadError extends DomainError {
  constructor(
    public readonly reason: FileUploadErrorCode,
    message: string = reason,
  ) {
    super(message, 'FILE_UPLOAD_ERROR');
    this.name = 'FileUploadError';
  }
}
