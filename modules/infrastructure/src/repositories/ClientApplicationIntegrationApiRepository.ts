import type { AxiosInstance } from 'axios';
import type {
  ClientApplicationIntegration,
  ClientApplicationIntegrationRepository,
  PublicClientApplicationIntegration,
  UpdateClientApplicationIntegrationCommand,
} from '@fe/domain';
import { ApiError } from '../api/apiError';

export class ClientApplicationIntegrationApiRepository
  implements ClientApplicationIntegrationRepository
{
  /**
   * @param client authenticated auth-service client (Bearer) for the admin routes
   * @param publicClient unauthenticated auth-service client for the public route
   */
  constructor(
    private readonly client: AxiosInstance,
    private readonly publicClient: AxiosInstance,
  ) {}

  async getIntegration(clientApplicationId: string): Promise<ClientApplicationIntegration> {
    const response = await this.client.get<ClientApplicationIntegration>(
      `/admin/client-applications/${clientApplicationId}/integration`,
    );
    return response.data;
  }

  async updateIntegration(
    command: UpdateClientApplicationIntegrationCommand,
  ): Promise<ClientApplicationIntegration> {
    const response = await this.client.put<ClientApplicationIntegration>(
      `/admin/client-applications/${command.clientApplicationId}/integration`,
      {
        trustedIssuers: command.trustedIssuers,
        allowedOrigins: command.allowedOrigins,
        allowedScopes: command.allowedScopes,
      },
    );
    return response.data;
  }

  async getPublicIntegration(
    clientApplicationId: string,
  ): Promise<PublicClientApplicationIntegration | null> {
    try {
      const response = await this.publicClient.get<PublicClientApplicationIntegration>(
        `/client-applications/${clientApplicationId}/integration`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof ApiError && error.isNotFound) return null;
      throw error;
    }
  }
}
