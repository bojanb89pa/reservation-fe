/**
 * A file parked in temporary storage, waiting to be claimed by a JSON request.
 * Valid for 24 hours, usable only by the uploader, and consumed on first use.
 */
export interface PendingUpload {
  uploadId: string;
  contentType: string;
  sizeInBytes: number;
  /** ISO-8601 local date-time without zone, e.g. "2026-09-11T15:14:40" */
  expiresAt: string;
}

/** Purpose declared when parking a file. */
export type UploadType = 'business-image' | 'profile-picture';

export const BUSINESS_IMAGE_UPLOAD_TYPE: UploadType = 'business-image';
export const PROFILE_PICTURE_UPLOAD_TYPE: UploadType = 'profile-picture';

// WARNING: `File` is the standard binary payload type carried from the file input — verify before merging
export interface UploadFileCommand {
  file: File;
  type: UploadType;
}
