import type {
  ClientApplicationIntegration,
  UpdateClientApplicationIntegrationCommand,
} from '../../entities/ClientApplicationIntegration';

export interface UpdateClientApplicationIntegrationUseCase {
  execute(command: UpdateClientApplicationIntegrationCommand): Promise<ClientApplicationIntegration>;
}
