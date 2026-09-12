import type { AxiosInstance } from 'axios';
import type {
  User,
  SetProfilePictureCommand,
  UserRepository,
  AdminUserSearchFilter,
  AdminCreateUserCommand,
  AdminUpdateUserCommand,
  UpdateUserStatusCommand,
  ResetUserPasswordCommand,
  PageRequest,
  PageResponse,
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

  async searchForAdmin(
    filter: AdminUserSearchFilter,
    pageRequest: PageRequest,
  ): Promise<PageResponse<User>> {
    const response = await this.client.get<PageResponse<User>>('/users/admin/accounts', {
      params: {
        search: filter.search,
        status: filter.status,
        page: pageRequest.page,
        size: pageRequest.size,
      },
    });
    return response.data;
  }

  async getByIdForAdmin(id: string): Promise<User> {
    const response = await this.client.get<User>(`/users/admin/accounts/${id}`);
    return response.data;
  }

  async createByAdmin(command: AdminCreateUserCommand): Promise<User> {
    const response = await this.client.post<User>('/users/admin/accounts', command);
    return response.data;
  }

  async updateByAdmin(id: string, command: AdminUpdateUserCommand): Promise<User> {
    const response = await this.client.put<User>(`/users/admin/accounts/${id}`, command);
    return response.data;
  }

  async updateStatus(id: string, command: UpdateUserStatusCommand): Promise<User> {
    const response = await this.client.patch<User>(`/users/admin/accounts/${id}/status`, command);
    return response.data;
  }

  async resetPassword(id: string, command: ResetUserPasswordCommand): Promise<User> {
    const response = await this.client.post<User>(
      `/users/admin/accounts/${id}/reset-password`,
      command,
    );
    return response.data;
  }

  async deleteByAdmin(id: string): Promise<void> {
    await this.client.delete(`/users/admin/accounts/${id}`);
  }
}
