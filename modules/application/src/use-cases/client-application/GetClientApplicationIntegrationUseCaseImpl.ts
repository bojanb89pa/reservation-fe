import type {
  ClientApplicationIntegration,
  ClientApplicationIntegrationRepository,
  GetClientApplicationIntegrationUseCase,
} from '@fe/domain';

export class GetClientApplicationIntegrationUseCaseImpl implements GetClientApplicationIntegrationUseCase {
  constructor(private readonly integrationRepository: ClientApplicationIntegrationRepository) {}

  execute(clientApplicationId: string): Promise<ClientApplicationIntegration> {
    return this.integrationRepository.getIntegration(clientApplicationId);
  }
}
