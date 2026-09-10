import { useMutation } from '@tanstack/react-query';
import { BUSINESS_IMAGE_UPLOAD_TYPE } from '@domain';
import { uploadFileUseCase } from '../app/container';

/**
 * Phase one of the two-phase image flow: park the file and get back a
 * `PendingUpload` whose `uploadId` the following JSON request claims. Nothing
 * is cached — an upload is consumed on first use and expires by itself in 24 hours.
 */
export function useUploadFile() {
  return useMutation({
    mutationFn: (file: File) =>
      uploadFileUseCase.execute({ file, type: BUSINESS_IMAGE_UPLOAD_TYPE }),
  });
}
