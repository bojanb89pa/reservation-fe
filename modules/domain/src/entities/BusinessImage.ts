import { FileUploadErrorCode } from '../errors/FileUploadError';

/** Content types the backend accepts for a business image. */
export const ALLOWED_BUSINESS_IMAGE_CONTENT_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

/** 5 MB, the backend limit. */
export const MAX_BUSINESS_IMAGE_SIZE_IN_BYTES = 5_242_880;

export interface BusinessImageCandidate {
  contentType: string;
  sizeInBytes: number;
}

/**
 * Pure pre-flight check so a file the backend would reject never leaves the client.
 * The backend repeats both checks; this one only shortens the feedback loop.
 * Returns `null` when the file is acceptable.
 */
export function validateBusinessImage(
  candidate: BusinessImageCandidate,
): FileUploadErrorCode | null {
  if (candidate.sizeInBytes <= 0) {
    return FileUploadErrorCode.FILE_EMPTY;
  }
  if (!ALLOWED_BUSINESS_IMAGE_CONTENT_TYPES.includes(candidate.contentType)) {
    return FileUploadErrorCode.CONTENT_TYPE_UNSUPPORTED;
  }
  if (candidate.sizeInBytes > MAX_BUSINESS_IMAGE_SIZE_IN_BYTES) {
    return FileUploadErrorCode.FILE_TOO_LARGE;
  }
  return null;
}
