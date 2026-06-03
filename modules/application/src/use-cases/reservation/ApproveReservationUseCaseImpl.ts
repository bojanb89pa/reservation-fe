import type { ReservationRepository, ApproveReservationUseCase, Reservation } from '@domain';

export class ApproveReservationUseCaseImpl implements ApproveReservationUseCase {
  constructor(private readonly reservationRepository: ReservationRepository) {}

  execute(resourceId: string, id: string): Promise<Reservation> {
    return this.reservationRepository.approve(resourceId, id);
  }
}
