import type { ClientApplicationIntegration } from '../../entities/ClientApplicationIntegration';

export interface GetClientApplicationIntegrationUseCase {
  execute(clientApplicationId: string): Promise<ClientApplicationIntegration>;
}
