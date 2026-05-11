import type { ReservationRepository } from '@domain/repositories/ReservationRepository';
import type { GetReservationUseCase } from '@domain/use-cases/reservation/GetReservationUseCase';
import type { Reservation } from '@domain/entities/Reservation';

export class GetReservationUseCaseImpl implements GetReservationUseCase {
  constructor(private readonly reservationRepository: ReservationRepository) {}

  execute(id: string): Promise<Reservation> {
    return this.reservationRepository.getById(id);
  }
}
