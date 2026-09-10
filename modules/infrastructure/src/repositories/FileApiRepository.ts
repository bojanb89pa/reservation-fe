import type { AxiosInstance } from 'axios';
import type { FileUploadRepository, PendingUpload, UploadFileCommand } from '@domain';

export class FileApiRepository implements FileUploadRepository {
  constructor(private readonly client: AxiosInstance) {}

  async upload(command: UploadFileCommand): Promise<PendingUpload> {
    const formData = new FormData();
    formData.append('file', command.file);
    formData.append('type', command.type);

    const response = await this.client.post<PendingUpload>('/files', formData, {
      // null, not undefined: it clears the client's default JSON content type so
      // axios keeps the FormData intact and the browser writes its own boundary.
      headers: { 'Content-Type': null },
    });
    return response.data;
  }
}
