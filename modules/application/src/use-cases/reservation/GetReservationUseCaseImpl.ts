import type { ReservationRepository, GetReservationUseCase, Reservation } from '@domain';

export class GetReservationUseCaseImpl implements GetReservationUseCase {
  constructor(private readonly reservationRepository: ReservationRepository) {}

  execute(id: string): Promise<Reservation> {
    return this.reservationRepository.getById(id);
  }
}
