import type { AxiosInstance } from 'axios';
import type {
  BusinessLocationRepository,
  BusinessLocation,
  CreateBusinessLocationCommand,
  UpdateBusinessLocationFromPlaceCommand,
} from '@domain';

export class BusinessLocationApiRepository implements BusinessLocationRepository {
  constructor(private readonly client: AxiosInstance) {}

  async create(
    businessId: string,
    command: CreateBusinessLocationCommand,
  ): Promise<BusinessLocation> {
    const response = await this.client.post<BusinessLocation>(
      `/api/businesses/${businessId}/locations`,
      command,
    );
    return response.data;
  }

  async list(businessId: string): Promise<BusinessLocation[]> {
    const response = await this.client.get<BusinessLocation[]>(
      `/api/businesses/${businessId}/locations`,
    );
    return response.data;
  }

  async getById(businessId: string, locationId: string): Promise<BusinessLocation> {
    const response = await this.client.get<BusinessLocation>(
      `/api/businesses/${businessId}/locations/${locationId}`,
    );
    return response.data;
  }

  async updateFromPlace(
    businessId: string,
    locationId: string,
    command: UpdateBusinessLocationFromPlaceCommand,
  ): Promise<BusinessLocation> {
    const response = await this.client.put<BusinessLocation>(
      `/api/businesses/${businessId}/locations/${locationId}/place`,
      command,
    );
    return response.data;
  }

  async confirm(businessId: string, locationId: string): Promise<BusinessLocation> {
    const response = await this.client.post<BusinessLocation>(
      `/api/businesses/${businessId}/locations/${locationId}/confirm`,
    );
    return response.data;
  }
}
