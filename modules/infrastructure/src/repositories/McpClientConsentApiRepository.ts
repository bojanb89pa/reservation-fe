import type { AxiosInstance } from 'axios';
import type { McpClientConsent, McpClientConsentRepository } from '@fe/domain';

export class McpClientConsentApiRepository implements McpClientConsentRepository {
  constructor(private readonly client: AxiosInstance) {}

  async getMine(): Promise<McpClientConsent[]> {
    const response = await this.client.get<McpClientConsent[]>('/users/me/mcp-consents');
    return response.data;
  }

  async revoke(clientId: string): Promise<void> {
    // `clientId` is an https URL; axios `params` URL-encodes it exactly once.
    await this.client.delete('/users/me/mcp-consents', { params: { clientId } });
  }
}
