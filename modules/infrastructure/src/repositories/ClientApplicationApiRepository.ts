import type { AxiosInstance } from 'axios';
import type {
  ClientApplicationRepository,
  ClientApplication,
  ClientApplicationDetail,
  CreateClientApplicationCommand,
} from '@fe/domain';

export class ClientApplicationApiRepository implements ClientApplicationRepository {
  constructor(private readonly client: AxiosInstance) {}

  async register(command: CreateClientApplicationCommand): Promise<ClientApplication> {
    const response = await this.client.post<ClientApplication>('/admin/client-applications', command);
    return response.data;
  }

  async getAll(): Promise<ClientApplication[]> {
    const response = await this.client.get<ClientApplication[]>('/admin/client-applications');
    return response.data;
  }

  async getById(id: string): Promise<ClientApplicationDetail> {
    const response = await this.client.get<ClientApplicationDetail>(`/admin/client-applications/${id}`);
    return response.data;
  }
}
