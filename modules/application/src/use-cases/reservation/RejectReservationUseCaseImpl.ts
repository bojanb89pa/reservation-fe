import type { ReservationRepository, RejectReservationUseCase, Reservation } from '@domain';

export class RejectReservationUseCaseImpl implements RejectReservationUseCase {
  constructor(private readonly reservationRepository: ReservationRepository) {}

  execute(resourceId: string, id: string): Promise<Reservation> {
    return this.reservationRepository.reject(resourceId, id);
  }
}
