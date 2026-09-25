import type { AxiosInstance } from 'axios';
import type { ClientApplicationRepository, ClientApplication, CreateClientApplicationCommand } from '@domain';

export class ClientApplicationApiRepository implements ClientApplicationRepository {
  constructor(private readonly client: AxiosInstance) {}

  async register(command: CreateClientApplicationCommand): Promise<ClientApplication> {
    const response = await this.client.post<ClientApplication>('/admin/client-applications', command);
    return response.data;
  }
}
