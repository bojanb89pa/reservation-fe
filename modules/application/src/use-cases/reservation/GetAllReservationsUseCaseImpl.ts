import type { GetAllReservationsUseCase, ReservationRepository, Reservation } from '@domain';

export class GetAllReservationsUseCaseImpl implements GetAllReservationsUseCase {
  constructor(private readonly reservationRepository: ReservationRepository) {}

  execute(): Promise<Reservation[]> {
    return this.reservationRepository.getAll();
  }
}
