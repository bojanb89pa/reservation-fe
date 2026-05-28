import type { AxiosInstance } from 'axios';
import type {
  BusinessServiceRepository,
  BusinessService,
  CreateBusinessServiceCommand,
  UpdateBusinessServiceCommand,
} from '@domain';

export class BusinessServiceApiRepository implements BusinessServiceRepository {
  constructor(private readonly client: AxiosInstance) {}

  async create(
    businessId: string,
    command: CreateBusinessServiceCommand,
  ): Promise<BusinessService> {
    const response = await this.client.post<BusinessService>(
      `/api/businesses/${businessId}/services`,
      command,
    );
    return response.data;
  }

  async list(businessId: string): Promise<BusinessService[]> {
    const response = await this.client.get<BusinessService[]>(
      `/api/businesses/${businessId}/services`,
    );
    return response.data;
  }

  async getById(businessId: string, serviceId: string): Promise<BusinessService> {
    const response = await this.client.get<BusinessService>(
      `/api/businesses/${businessId}/services/${serviceId}`,
    );
    return response.data;
  }

  async update(
    businessId: string,
    serviceId: string,
    command: UpdateBusinessServiceCommand,
  ): Promise<BusinessService> {
    const response = await this.client.put<BusinessService>(
      `/api/businesses/${businessId}/services/${serviceId}`,
      command,
    );
    return response.data;
  }

  async delete(businessId: string, serviceId: string): Promise<BusinessService> {
    const response = await this.client.delete<BusinessService>(
      `/api/businesses/${businessId}/services/${serviceId}`,
    );
    return response.data;
  }
}
