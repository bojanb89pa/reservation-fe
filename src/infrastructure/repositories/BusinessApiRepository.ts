import type { AxiosInstance } from 'axios';
import type { BusinessRepository } from '@domain/repositories/BusinessRepository';
import type { Business } from '@domain/entities/Business';
import type { PageRequest, PageResponse } from '@domain/types/Page';

export class BusinessApiRepository implements BusinessRepository {
  constructor(private readonly client: AxiosInstance) {}

  async getAll(pageRequest: PageRequest): Promise<PageResponse<Business>> {
    const response = await this.client.get<PageResponse<Business>>('/api/businesses/all', {
      params: { page: pageRequest.page, size: pageRequest.size },
    });
    return response.data;
  }

  async getById(id: string): Promise<Business> {
    const response = await this.client.get<Business>(`/api/businesses/${id}`);
    return response.data;
  }

  async create(business: Pick<Business, 'name'>): Promise<Business> {
    const response = await this.client.post<Business>('/api/businesses', { id: null, ...business });
    return response.data;
  }
}
