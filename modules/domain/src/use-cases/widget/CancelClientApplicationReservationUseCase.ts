import type { ClientApplicationReservation } from '../../entities/ClientApplicationReservation';

export interface CancelClientApplicationReservationUseCase {
  execute(
    partnerAccessToken: string,
    reservationId: string,
  ): Promise<ClientApplicationReservation>;
}
