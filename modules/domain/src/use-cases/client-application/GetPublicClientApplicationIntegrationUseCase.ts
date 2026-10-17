import type { PublicClientApplicationIntegration } from '../../entities/ClientApplicationIntegration';

export interface GetPublicClientApplicationIntegrationUseCase {
  execute(clientApplicationId: string): Promise<PublicClientApplicationIntegration | null>;
}
