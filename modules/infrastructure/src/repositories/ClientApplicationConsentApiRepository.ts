import type { AxiosInstance } from 'axios';
import type {
  ClientApplicationConsentRepository,
  ClientApplicationLocationConsent,
  OwnerClientApplicationConsent,
} from '@fe/domain';

export class ClientApplicationConsentApiRepository implements ClientApplicationConsentRepository {
  constructor(private readonly client: AxiosInstance) {}

  async getMine(): Promise<OwnerClientApplicationConsent[]> {
    const response = await this.client.get<OwnerClientApplicationConsent[]>(
      '/client-application-consents',
    );
    return response.data;
  }

  async approve(consentId: string): Promise<ClientApplicationLocationConsent> {
    const response = await this.client.post<ClientApplicationLocationConsent>(
      `/client-application-consents/${consentId}/approve`,
    );
    return response.data;
  }

  async revoke(consentId: string): Promise<ClientApplicationLocationConsent> {
    const response = await this.client.post<ClientApplicationLocationConsent>(
      `/client-application-consents/${consentId}/revoke`,
    );
    return response.data;
  }
}
