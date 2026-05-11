import type { ReservationRepository } from '@domain/repositories/ReservationRepository';
import type { CreateReservationUseCase } from '@domain/use-cases/reservation/CreateReservationUseCase';
import type { Reservation, CreateReservationCommand } from '@domain/entities/Reservation';

export class CreateReservationUseCaseImpl implements CreateReservationUseCase {
  constructor(private readonly reservationRepository: ReservationRepository) {}

  execute(resourceId: string, command: CreateReservationCommand): Promise<Reservation> {
    return this.reservationRepository.create(resourceId, command);
  }
}
