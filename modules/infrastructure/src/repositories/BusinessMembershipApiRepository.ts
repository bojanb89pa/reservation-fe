import type { AxiosInstance } from 'axios';
import type {
  BusinessMembership,
  BusinessMemberRole,
  BusinessMembershipRepository,
  NotifyBusinessMembershipCommand,
} from '@domain';

function roleSegment(role: BusinessMemberRole): string {
  return role === 'OWNER' ? 'owners' : 'employees';
}

export class BusinessMembershipApiRepository implements BusinessMembershipRepository {
  constructor(
    private readonly client: AxiosInstance,
    private readonly authClient: AxiosInstance,
  ) {}

  async add(
    businessId: string,
    email: string,
    role: BusinessMemberRole,
  ): Promise<BusinessMembership> {
    const response = await this.client.post<BusinessMembership>(
      `/businesses/${businessId}/${roleSegment(role)}`,
      { email },
    );
    return response.data;
  }

  async remove(businessId: string, userId: string, role: BusinessMemberRole): Promise<void> {
    await this.client.delete(`/businesses/${businessId}/${roleSegment(role)}/${userId}`);
  }

  async list(businessId: string, role: BusinessMemberRole): Promise<BusinessMembership[]> {
    const response = await this.client.get<BusinessMembership[]>(
      `/businesses/${businessId}/${roleSegment(role)}`,
    );
    return response.data;
  }

  async notifyMembership(command: NotifyBusinessMembershipCommand): Promise<void> {
    // WARNING: 403 (BUSINESS_OWNER_REQUIRED) and 404 (BUSINESS_MEMBERSHIP_NOT_FOUND) stay ApiError with status — @domain has no matching error types — verify before merging
    await this.authClient.post('/users/notify-membership', {
      businessId: command.businessId,
      email: command.email,
    });
  }
}
