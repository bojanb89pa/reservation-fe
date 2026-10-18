import type {
  ClientApplicationIntegration,
  ClientApplicationIntegrationRepository,
  UpdateClientApplicationIntegrationCommand,
  UpdateClientApplicationIntegrationUseCase,
} from '@fe/domain';

export class UpdateClientApplicationIntegrationUseCaseImpl implements UpdateClientApplicationIntegrationUseCase {
  constructor(private readonly integrationRepository: ClientApplicationIntegrationRepository) {}

  execute(command: UpdateClientApplicationIntegrationCommand): Promise<ClientApplicationIntegration> {
    return this.integrationRepository.updateIntegration(command);
  }
}
