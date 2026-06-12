import type { AxiosInstance } from 'axios';
import type { AvailabilityBlockRepository, AvailabilityBlock } from '@domain';

export class AvailabilityBlockApiRepository implements AvailabilityBlockRepository {
  constructor(private readonly client: AxiosInstance) {}

  async getAvailabilityBlocks(
    resourceId: string,
    serviceId: string,
    from: string,
    to: string,
  ): Promise<AvailabilityBlock[]> {
    const response = await this.client.get<AvailabilityBlock[]>(
      `/api/resources/${resourceId}/availability-blocks`,
      { params: { serviceId, from, to } },
    );
    return response.data;
  }
}
