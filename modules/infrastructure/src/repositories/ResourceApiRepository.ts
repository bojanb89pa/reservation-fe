import type { AxiosInstance } from 'axios';
import type {
  ResourceRepository,
  Resource,
  CreateResourceCommand,
  PageRequest,
  PageResponse,
} from '@domain';

export class ResourceApiRepository implements ResourceRepository {
  constructor(private readonly client: AxiosInstance) {}

  async getAllByBusiness(
    businessId: string,
    pageRequest: PageRequest,
  ): Promise<PageResponse<Resource>> {
    const response = await this.client.get<PageResponse<Resource>>(
      `/api/businesses/${businessId}/resources`,
      { params: { page: pageRequest.page, size: pageRequest.size } },
    );
    return response.data;
  }

  async getById(id: string): Promise<Resource> {
    const response = await this.client.get<Resource>(`/api/resources/${id}`);
    return response.data;
  }

  async create(businessId: string, command: CreateResourceCommand): Promise<Resource> {
    const response = await this.client.post<Resource>(`/api/businesses/${businessId}/resources`, {
      id: null,
      businessId,
      ...command,
    });
    return response.data;
  }
}
