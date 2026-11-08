import type {
  CancelClientApplicationReservationUseCase,
  ClientApplicationReservation,
  ClientApplicationWidgetRepository,
} from '@fe/domain';

export class CancelClientApplicationReservationUseCaseImpl implements CancelClientApplicationReservationUseCase {
  constructor(private readonly widgetRepository: ClientApplicationWidgetRepository) {}

  execute(partnerAccessToken: string, reservationId: string): Promise<ClientApplicationReservation> {
    return this.widgetRepository.cancelReservation(partnerAccessToken, reservationId);
  }
}
