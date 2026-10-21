import type { ClientApplicationWidgetConfig } from '../entities/ClientApplicationWidget';
import type {
  ClientApplicationReservation,
  CreateClientApplicationReservationCommand,
} from '../entities/ClientApplicationReservation';

export interface ClientApplicationWidgetRepository {
  /** Public, no auth. Rejects with `NotFoundError` for an unknown partner. */
  getWidgetConfig(clientApplicationId: string): Promise<ClientApplicationWidgetConfig>;
  /**
   * Books with the partner access token from token exchange, never the Reserva user session.
   * Rejects with `ReservationSlotTakenError` (409), `UnprocessableEntityError` (422; code
   * `CLIENT_APPLICATION_LOCATION_CONSENT_NOT_APPROVED` when consent is missing), `NotFoundError` (404).
   */
  createReservation(
    partnerAccessToken: string,
    command: CreateClientApplicationReservationCommand,
  ): Promise<ClientApplicationReservation>;
}
