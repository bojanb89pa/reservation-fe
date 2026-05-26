import type { AxiosInstance } from 'axios';
import type {
  BusinessCategoryRepository,
  BusinessCategory,
  CreateBusinessCategoryCommand,
  UpdateBusinessCategoryCommand,
} from '@domain';

export class BusinessCategoryApiRepository implements BusinessCategoryRepository {
  constructor(private readonly client: AxiosInstance) {}

  async list(): Promise<BusinessCategory[]> {
    const response = await this.client.get<BusinessCategory[]>('/api/business-categories');
    return response.data;
  }

  async get(id: string): Promise<BusinessCategory> {
    const response = await this.client.get<BusinessCategory>(`/api/business-categories/${id}`);
    return response.data;
  }

  async create(command: CreateBusinessCategoryCommand): Promise<BusinessCategory> {
    const response = await this.client.post<BusinessCategory>('/api/business-categories', command);
    return response.data;
  }

  async update(id: string, command: UpdateBusinessCategoryCommand): Promise<BusinessCategory> {
    const response = await this.client.put<BusinessCategory>(
      `/api/business-categories/${id}`,
      command,
    );
    return response.data;
  }

  async delete(id: string): Promise<BusinessCategory> {
    const response = await this.client.delete<BusinessCategory>(`/api/business-categories/${id}`);
    return response.data;
  }
}
