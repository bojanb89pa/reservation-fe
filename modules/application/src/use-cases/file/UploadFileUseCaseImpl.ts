import type {
  FileUploadRepository,
  UploadFileUseCase,
  UploadFileCommand,
  PendingUpload,
} from '@domain';
import { BUSINESS_IMAGE_UPLOAD_TYPE, FileUploadError, validateBusinessImage } from '@domain';

export class UploadFileUseCaseImpl implements UploadFileUseCase {
  constructor(private readonly fileUploadRepository: FileUploadRepository) {}

  /**
   * Runs the domain pre-flight check before spending a request, so a file the
   * backend would reject never leaves the client. The backend still repeats it.
   */
  async execute(command: UploadFileCommand): Promise<PendingUpload> {
    if (command.type === BUSINESS_IMAGE_UPLOAD_TYPE) {
      const reason = validateBusinessImage({
        contentType: command.file.type,
        sizeInBytes: command.file.size,
      });
      if (reason !== null) {
        throw new FileUploadError(reason);
      }
    }

    return this.fileUploadRepository.upload(command);
  }
}
