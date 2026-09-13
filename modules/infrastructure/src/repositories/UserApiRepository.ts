import type { AxiosInstance } from 'axios';
import type {
  User,
  SetProfilePictureCommand,
  UserRepository,
  UserSummary,
  SearchUsersQuery,
} from '@domain';

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

  async searchUsers(query: SearchUsersQuery): Promise<UserSummary[]> {
    const response = await this.client.get<UserSummary[]>('/users/search', {
      params: { query: query.query, limit: query.limit },
    });
    return response.data;
  }
}
