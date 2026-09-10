import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ALLOWED_BUSINESS_IMAGE_CONTENT_TYPES,
  MAX_BUSINESS_IMAGE_SIZE_IN_BYTES,
  FileUploadError,
  FileUploadErrorCode,
} from '@domain';

/** `accept` for the file input — the domain constant is the only source of the allowed types. */
export const BUSINESS_IMAGE_ACCEPT = ALLOWED_BUSINESS_IMAGE_CONTENT_TYPES.join(',');

const BYTES_IN_MEGABYTE = 1024 * 1024;

/** "image/jpeg" → "JPEG", so the limit hint stays in sync with the domain list. */
function toFormatLabel(contentType: string): string {
  const subtype = contentType.slice(contentType.indexOf('/') + 1);
  return subtype === 'webp' ? 'WebP' : subtype.toUpperCase();
}

const FORMATS = ALLOWED_BUSINESS_IMAGE_CONTENT_TYPES.map(toFormatLabel).join(', ');
const MAX_SIZE_MB = Math.floor(MAX_BUSINESS_IMAGE_SIZE_IN_BYTES / BYTES_IN_MEGABYTE);

/**
 * Every user-visible string around business images: the limit hint and the
 * translation of a rejected upload. The raw backend message is never shown —
 * it carries a key such as `error.file.too_large`.
 */
export function useBusinessImageMessages() {
  const { t } = useTranslation();

  const limitHint = t('businessImage.limitHint', {
    formats: FORMATS,
    maxSizeMb: MAX_SIZE_MB,
  });

  /** `null` when the failure is not an upload rejection, so callers keep their own fallback. */
  const uploadErrorMessage = useCallback(
    (error: unknown): string | null => {
      if (!(error instanceof FileUploadError)) return null;
      switch (error.reason) {
        case FileUploadErrorCode.CONTENT_TYPE_UNSUPPORTED:
        case FileUploadErrorCode.FILE_EMPTY:
          return t('businessImage.errorContentType', { formats: FORMATS });
        case FileUploadErrorCode.FILE_TOO_LARGE:
          return t('businessImage.errorTooLarge', { maxSizeMb: MAX_SIZE_MB });
        case FileUploadErrorCode.UPLOAD_NOT_FOUND:
          return t('businessImage.errorUploadExpired');
        case FileUploadErrorCode.UPLOAD_FORBIDDEN:
          // WARNING: ticket maps UPLOAD_FORBIDDEN to a "not found" wording — verify before merging
          return t('businessImage.errorUploadMissing');
        default:
          return t('businessImage.errorGeneric');
      }
    },
    [t],
  );

  return { accept: BUSINESS_IMAGE_ACCEPT, limitHint, uploadErrorMessage };
}
