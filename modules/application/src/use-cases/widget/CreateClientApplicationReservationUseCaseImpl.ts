import type {
  ClientApplicationReservation,
  ClientApplicationWidgetRepository,
  CreateClientApplicationReservationCommand,
  CreateClientApplicationReservationUseCase,
} from '@fe/domain';

export class CreateClientApplicationReservationUseCaseImpl implements CreateClientApplicationReservationUseCase {
  constructor(private readonly widgetRepository: ClientApplicationWidgetRepository) {}

  execute(
    partnerAccessToken: string,
    command: CreateClientApplicationReservationCommand,
  ): Promise<ClientApplicationReservation> {
    return this.widgetRepository.createReservation(partnerAccessToken, command);
  }
}
