import type {
  ClientApplicationIntegrationRepository,
  GetPublicClientApplicationIntegrationUseCase,
  PublicClientApplicationIntegration,
} from '@fe/domain';

export class GetPublicClientApplicationIntegrationUseCaseImpl implements GetPublicClientApplicationIntegrationUseCase {
  constructor(private readonly integrationRepository: ClientApplicationIntegrationRepository) {}

  execute(clientApplicationId: string): Promise<PublicClientApplicationIntegration | null> {
    return this.integrationRepository.getPublicIntegration(clientApplicationId);
  }
}
