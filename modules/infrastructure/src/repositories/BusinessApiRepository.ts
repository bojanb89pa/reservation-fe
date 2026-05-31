import type { AxiosInstance } from 'axios';
import type {
  BusinessRepository,
  Business,
  PageRequest,
  PageResponse,
  SubmitBusinessCommand,
  CreateBusinessByAdminCommand,
  SetBusinessCategoryCommand,
} from '@domain';

export class BusinessApiRepository implements BusinessRepository {
  constructor(private readonly client: AxiosInstance) {}

  async getMyBusinesses(pageRequest: PageRequest): Promise<PageResponse<Business>> {
    const response = await this.client.get<PageResponse<Business>>('/api/businesses/me', {
      params: { page: pageRequest.page, size: pageRequest.size },
    });
    return response.data;
  }

  async search(query: string, pageRequest: PageRequest): Promise<PageResponse<Business>> {
    const response = await this.client.get<PageResponse<Business>>('/api/businesses/search', {
      params: { search: query, page: pageRequest.page, size: pageRequest.size },
    });
    return response.data;
  }

  async getByCategory(
    categoryId: string,
    pageRequest: PageRequest,
  ): Promise<PageResponse<Business>> {
    const response = await this.client.get<PageResponse<Business>>(
      `/api/businesses/category/${categoryId}`,
      {
        params: { page: pageRequest.page, size: pageRequest.size },
      },
    );
    return response.data;
  }

  async getById(id: string): Promise<Business> {
    const response = await this.client.get<Business>(`/api/businesses/${id}`);
    return response.data;
  }

  async submit(command: SubmitBusinessCommand): Promise<Business> {
    const response = await this.client.post<Business>('/api/businesses/submit', command);
    return response.data;
  }

  async createByAdmin(command: CreateBusinessByAdminCommand): Promise<Business> {
    const response = await this.client.post<Business>('/api/businesses/admin', command);
    return response.data;
  }

  async activate(id: string): Promise<Business> {
    const response = await this.client.post<Business>(`/api/businesses/${id}/activate`);
    return response.data;
  }

  async reject(id: string): Promise<Business> {
    const response = await this.client.post<Business>(`/api/businesses/${id}/reject`);
    return response.data;
  }

  async delete(id: string): Promise<Business> {
    const response = await this.client.delete<Business>(`/api/businesses/${id}`);
    return response.data;
  }

  async setCategory(id: string, command: SetBusinessCategoryCommand): Promise<Business> {
    const response = await this.client.put<Business>(`/api/businesses/${id}/category`, command);
    return response.data;
  }
}
