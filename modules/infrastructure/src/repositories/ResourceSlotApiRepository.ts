import type { AxiosInstance } from 'axios';
import type { ResourceSlotRepository, ResourceSlot } from '@domain';

export class ResourceSlotApiRepository implements ResourceSlotRepository {
  constructor(private readonly client: AxiosInstance) {}

  async getSlots(
    resourceId: string,
    serviceId: string,
    from: string,
    to: string,
  ): Promise<ResourceSlot[]> {
    const response = await this.client.get<ResourceSlot[]>(
      `/api/resources/${resourceId}/slots`,
      { params: { serviceId, from, to } },
    );
    return response.data;
  }
}
