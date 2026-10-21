import type {
  ClientApplicationReservation,
  CreateClientApplicationReservationCommand,
} from '../../entities/ClientApplicationReservation';

export interface CreateClientApplicationReservationUseCase {
  execute(
    partnerAccessToken: string,
    command: CreateClientApplicationReservationCommand,
  ): Promise<ClientApplicationReservation>;
}
