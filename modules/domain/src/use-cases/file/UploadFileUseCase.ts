import type { PendingUpload, UploadFileCommand } from '../../entities/PendingUpload';

export interface UploadFileUseCase {
  execute(command: UploadFileCommand): Promise<PendingUpload>;
}
