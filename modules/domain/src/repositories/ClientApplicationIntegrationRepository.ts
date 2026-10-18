import type {
  ClientApplicationIntegration,
  PublicClientApplicationIntegration,
  UpdateClientApplicationIntegrationCommand,
} from '../entities/ClientApplicationIntegration';

export interface ClientApplicationIntegrationRepository {
  /** Empty configuration when none is saved yet; rejects with `NotFoundError` for an unknown partner. */
  getIntegration(clientApplicationId: string): Promise<ClientApplicationIntegration>;
  updateIntegration(
    command: UpdateClientApplicationIntegrationCommand,
  ): Promise<ClientApplicationIntegration>;
  /** `null` when the partner has no integration configured yet. */
  getPublicIntegration(
    clientApplicationId: string,
  ): Promise<PublicClientApplicationIntegration | null>;
}
