import type { AxiosInstance } from 'axios';
import type { FileUploadRepository, PendingUpload, UploadFileCommand } from '@domain';
import { PROFILE_PICTURE_UPLOAD_TYPE } from '@domain';

// WARNING: constructor now takes a second client for the auth-service host — the composition
// root wiring (`new FileApiRepository(resourceAxiosClient)`) must be updated to pass
// `authenticatedAuthAxiosClient` as the second argument — verify before merging
export class FileApiRepository implements FileUploadRepository {
  constructor(
    private readonly resourceClient: AxiosInstance,
    private readonly authClient: AxiosInstance,
  ) {}

  async upload(command: UploadFileCommand): Promise<PendingUpload> {
    const formData = new FormData();
    formData.append('file', command.file);
    formData.append('type', command.type);

    const isProfilePicture = command.type === PROFILE_PICTURE_UPLOAD_TYPE;
    const client = isProfilePicture ? this.authClient : this.resourceClient;
    const path = isProfilePicture ? '/users/files' : '/files';

    const response = await client.post<PendingUpload>(path, formData, {
      // null, not undefined: it clears the client's default JSON content type so
      // axios keeps the FormData intact and the browser writes its own boundary.
      headers: { 'Content-Type': null },
    });
    return response.data;
  }
}
