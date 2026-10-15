import type { AxiosInstance } from 'axios';
import type {
  User,
  SetProfilePictureCommand,
  UpdateOwnProfileCommand,
  UserRepository,
  AdminUserSearchFilter,
  AdminCreateUserCommand,
  AdminUpdateUserCommand,
  UpdateUserStatusCommand,
  ResetUserPasswordCommand,
  PageRequest,
  PageResponse,
  UserSummary,
  SearchUsersQuery,
} from '@fe/domain';

export class UserApiRepository implements UserRepository {
  constructor(private readonly client: AxiosInstance) {}

  async updateOwnProfile(command: UpdateOwnProfileCommand): Promise<User> {
    // base URL of the auth client already ends with /auth, so this is PATCH /auth/users/me
    const response = await this.client.patch<User>('/users/me', {
      firstName: command.firstName,
      lastName: command.lastName,
    });
    return response.data;
  }

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

  // WARNING: 403 (BUSINESS_MEMBERSHIP_REQUIRED) stays ApiError with status — @domain has no matching error type — verify before merging
  async searchUsers(query: SearchUsersQuery): Promise<UserSummary[]> {
    const response = await this.client.get<UserSummary[]>('/users/search', {
      params: { query: query.query, limit: query.limit },
    });
    return response.data;
  }
}
