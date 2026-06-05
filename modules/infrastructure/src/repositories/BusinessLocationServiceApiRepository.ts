import type { AxiosInstance } from 'axios';
import type {
  BusinessLocationServiceRepository,
  BusinessLocationService,
  AddServiceToLocationCommand,
} from '@domain';

export class BusinessLocationServiceApiRepository implements BusinessLocationServiceRepository {
  constructor(private readonly client: AxiosInstance) {}

  async add(
    businessId: string,
    locationId: string,
    command: AddServiceToLocationCommand,
  ): Promise<BusinessLocationService> {
    const response = await this.client.post<BusinessLocationService>(
      `/api/businesses/${businessId}/locations/${locationId}/services`,
      command,
    );
    return response.data;
  }

  async list(businessId: string, locationId: string): Promise<BusinessLocationService[]> {
    const response = await this.client.get<BusinessLocationService[]>(
      `/api/businesses/${businessId}/locations/${locationId}/services`,
    );
    return response.data;
  }

  async remove(businessId: string, locationId: string, serviceId: string): Promise<void> {
    await this.client.delete(
      `/api/businesses/${businessId}/locations/${locationId}/services/${serviceId}`,
    );
  }
}
