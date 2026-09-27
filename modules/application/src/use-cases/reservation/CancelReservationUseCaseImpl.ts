import type { ReservationRepository, CancelReservationUseCase, Reservation } from '@domain';

export class CancelReservationUseCaseImpl implements CancelReservationUseCase {
  constructor(private readonly reservationRepository: ReservationRepository) {}

  execute(resourceId: string, id: string): Promise<Reservation> {
    return this.reservationRepository.cancel(resourceId, id);
  }
}
