import type { AxiosInstance } from 'axios';
import type {
  BusinessRepository,
  Business,
  BusinessSearchFilter,
  PageRequest,
  PageResponse,
  SubmitBusinessCommand,
  CreateBusinessByAdminCommand,
  SetBusinessCategoryCommand,
  SetBusinessImageCommand,
} from '@domain';
import { withResolvedImageUrl } from '../api/resolveApiUrl';

function resolvePage(page: PageResponse<Business>): PageResponse<Business> {
  return { ...page, content: page.content.map(withResolvedImageUrl) };
}

export class BusinessApiRepository implements BusinessRepository {
  constructor(private readonly client: AxiosInstance) {}

  async getMyBusinesses(pageRequest: PageRequest): Promise<PageResponse<Business>> {
    const response = await this.client.get<PageResponse<Business>>('/businesses/me', {
      params: { page: pageRequest.page, size: pageRequest.size },
    });
    return resolvePage(response.data);
  }

  async getAllForAdmin(pageRequest: PageRequest): Promise<PageResponse<Business>> {
    const response = await this.client.get<PageResponse<Business>>('/businesses/admin', {
      params: { page: pageRequest.page, size: pageRequest.size },
    });
    return resolvePage(response.data);
  }

  async search(
    filter: BusinessSearchFilter,
    pageRequest: PageRequest,
  ): Promise<PageResponse<Business>> {
    const response = await this.client.get<PageResponse<Business>>('/businesses/search', {
      params: {
        search: filter.query,
        categoryIds: filter.categoryIds,
        page: pageRequest.page,
        size: pageRequest.size,
      },
    });
    return resolvePage(response.data);
  }

  async getByCategory(
    categoryId: string,
    pageRequest: PageRequest,
  ): Promise<PageResponse<Business>> {
    const response = await this.client.get<PageResponse<Business>>(
      `/businesses/category/${categoryId}`,
      {
        params: { page: pageRequest.page, size: pageRequest.size },
      },
    );
    return resolvePage(response.data);
  }

  async getById(id: string): Promise<Business> {
    const response = await this.client.get<Business>(`/businesses/${id}`);
    return withResolvedImageUrl(response.data);
  }

  async submit(command: SubmitBusinessCommand): Promise<Business> {
    const response = await this.client.post<Business>('/businesses/submit', command);
    return withResolvedImageUrl(response.data);
  }

  async createByAdmin(command: CreateBusinessByAdminCommand): Promise<Business> {
    const response = await this.client.post<Business>('/businesses/admin', command);
    return withResolvedImageUrl(response.data);
  }

  async activate(id: string): Promise<Business> {
    const response = await this.client.post<Business>(`/businesses/${id}/activate`);
    return withResolvedImageUrl(response.data);
  }

  async reject(id: string): Promise<Business> {
    const response = await this.client.post<Business>(`/businesses/${id}/reject`);
    return withResolvedImageUrl(response.data);
  }

  async delete(id: string): Promise<Business> {
    const response = await this.client.delete<Business>(`/businesses/${id}`);
    return withResolvedImageUrl(response.data);
  }

  async setCategory(id: string, command: SetBusinessCategoryCommand): Promise<Business> {
    const response = await this.client.put<Business>(`/businesses/${id}/category`, command);
    return withResolvedImageUrl(response.data);
  }

  async setImage(id: string, command: SetBusinessImageCommand): Promise<Business> {
    const response = await this.client.put<Business>(`/businesses/${id}/image`, command);
    return withResolvedImageUrl(response.data);
  }

  async removeImage(id: string): Promise<Business> {
    const response = await this.client.delete<Business>(`/businesses/${id}/image`);
    return withResolvedImageUrl(response.data);
  }
}
