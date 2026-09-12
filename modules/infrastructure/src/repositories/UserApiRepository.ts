import type { AxiosInstance } from 'axios';
import type { User, SetProfilePictureCommand, UserRepository } from '@domain';

export class UserApiRepository implements UserRepository {
  constructor(private readonly client: AxiosInstance) {}

  async setProfilePicture(command: SetProfilePictureCommand): Promise<User> {
    const response = await this.client.put<User>('/users/me/profile-picture', command);
    return response.data;
  }

  async deleteProfilePicture(): Promise<User> {
    const response = await this.client.delete<User>('/users/me/profile-picture');
    return response.data;
  }

  async getUsersByIds(ids: string[]): Promise<User[]> {
    const response = await this.client.get<User[]>('/users/batch', {
      params: { ids: ids.join(',') },
    });
    return response.data;
  }
}
