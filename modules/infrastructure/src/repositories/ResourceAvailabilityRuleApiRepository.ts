import type { AxiosInstance } from 'axios';
import type {
  ResourceAvailabilityRuleRepository,
  ResourceAvailabilityRule,
  CreateAvailabilityRuleCommand,
} from '@domain';

export class ResourceAvailabilityRuleApiRepository
  implements ResourceAvailabilityRuleRepository
{
  constructor(private readonly client: AxiosInstance) {}

  async getAllByResource(resourceId: string): Promise<ResourceAvailabilityRule[]> {
    const response = await this.client.get<ResourceAvailabilityRule[]>(
      `/api/resources/${resourceId}/availability-rules`,
    );
    return response.data;
  }

  async create(
    resourceId: string,
    command: CreateAvailabilityRuleCommand,
  ): Promise<ResourceAvailabilityRule> {
    const response = await this.client.post<ResourceAvailabilityRule>(
      `/api/resources/${resourceId}/availability-rules`,
      { id: null, resourceId, ...command },
    );
    return response.data;
  }

  async delete(resourceId: string, ruleId: string): Promise<void> {
    await this.client.delete(
      `/api/resources/${resourceId}/availability-rules/${ruleId}`,
    );
  }
}
