import { FileUploadErrorCode } from '../errors/FileUploadError';

/** Content types the backend accepts for a profile picture. */
export const ALLOWED_PROFILE_PICTURE_CONTENT_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

/** 10 MB, the backend limit. */
export const MAX_PROFILE_PICTURE_SIZE_IN_BYTES = 10_485_760;

export interface ProfilePictureCandidate {
  contentType: string;
  sizeInBytes: number;
}

/**
 * Pure pre-flight check so a file the backend would reject never leaves the client.
 * The backend repeats both checks; this one only shortens the feedback loop.
 * Returns `null` when the file is acceptable.
 */
export function validateProfilePicture(
  candidate: ProfilePictureCandidate,
): FileUploadErrorCode | null {
  if (candidate.sizeInBytes <= 0) {
    return FileUploadErrorCode.FILE_EMPTY;
  }
  if (!ALLOWED_PROFILE_PICTURE_CONTENT_TYPES.includes(candidate.contentType)) {
    return FileUploadErrorCode.CONTENT_TYPE_UNSUPPORTED;
  }
  if (candidate.sizeInBytes > MAX_PROFILE_PICTURE_SIZE_IN_BYTES) {
    return FileUploadErrorCode.FILE_TOO_LARGE;
  }
  return null;
}
