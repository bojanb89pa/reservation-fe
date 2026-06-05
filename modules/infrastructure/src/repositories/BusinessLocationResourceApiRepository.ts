import type { AxiosInstance } from 'axios';
import type {
  BusinessLocationResourceRepository,
  BusinessLocationResource,
  AddResourceToLocationCommand,
} from '@domain';

export class BusinessLocationResourceApiRepository implements BusinessLocationResourceRepository {
  constructor(private readonly client: AxiosInstance) {}

  async add(
    businessId: string,
    locationId: string,
    command: AddResourceToLocationCommand,
  ): Promise<BusinessLocationResource> {
    const response = await this.client.post<BusinessLocationResource>(
      `/api/businesses/${businessId}/locations/${locationId}/resources`,
      command,
    );
    return response.data;
  }

  async list(businessId: string, locationId: string): Promise<BusinessLocationResource[]> {
    const response = await this.client.get<BusinessLocationResource[]>(
      `/api/businesses/${businessId}/locations/${locationId}/resources`,
    );
    return response.data;
  }

  async remove(businessId: string, locationId: string, resourceId: string): Promise<void> {
    await this.client.delete(
      `/api/businesses/${businessId}/locations/${locationId}/resources/${resourceId}`,
    );
  }
}
