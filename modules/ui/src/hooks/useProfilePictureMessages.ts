import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ALLOWED_PROFILE_PICTURE_CONTENT_TYPES,
  MAX_PROFILE_PICTURE_SIZE_IN_BYTES,
  FileUploadError,
  FileUploadErrorCode,
} from '@domain';

/** `accept` for the file input — the domain constant is the only source of the allowed types. */
export const PROFILE_PICTURE_ACCEPT = ALLOWED_PROFILE_PICTURE_CONTENT_TYPES.join(',');

const BYTES_IN_MEGABYTE = 1024 * 1024;
const MAX_SIZE_MB = Math.floor(MAX_PROFILE_PICTURE_SIZE_IN_BYTES / BYTES_IN_MEGABYTE);

/**
 * Every user-visible string around the profile picture: the limit hint and the
 * translation of a rejected upload/claim. The status code is what we branch on
 * (mapped to a `FileUploadErrorCode` upstream) — the raw backend message never
 * reaches the user.
 */
export function useProfilePictureMessages() {
  const { t } = useTranslation();

  const limitHint = t('profilePicture.limitHint', { maxSizeMb: MAX_SIZE_MB });

  /** `null` when the failure is not an upload rejection, so callers keep their own fallback. */
  const uploadErrorMessage = useCallback(
    (error: unknown): string | null => {
      if (!(error instanceof FileUploadError)) return null;
      switch (error.reason) {
        case FileUploadErrorCode.CONTENT_TYPE_UNSUPPORTED:
        case FileUploadErrorCode.FILE_EMPTY:
          return t('profilePicture.errorContentType');
        case FileUploadErrorCode.FILE_TOO_LARGE:
          return t('profilePicture.errorTooLarge', { maxSizeMb: MAX_SIZE_MB });
        case FileUploadErrorCode.UPLOAD_NOT_FOUND:
          return t('profilePicture.errorUploadExpired');
        case FileUploadErrorCode.UPLOAD_FORBIDDEN:
          return t('profilePicture.errorUploadMissing');
        default:
          return t('profilePicture.errorGeneric');
      }
    },
    [t],
  );

  return { accept: PROFILE_PICTURE_ACCEPT, limitHint, uploadErrorMessage };
}
