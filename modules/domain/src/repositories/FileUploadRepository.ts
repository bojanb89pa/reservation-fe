import type { PendingUpload, UploadFileCommand } from '../entities/PendingUpload';

export interface FileUploadRepository {
  upload(command: UploadFileCommand): Promise<PendingUpload>;
}
