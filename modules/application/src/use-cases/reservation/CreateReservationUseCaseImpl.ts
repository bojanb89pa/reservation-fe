import type {
  ReservationRepository,
  CreateReservationUseCase,
  Reservation,
  CreateReservationCommand,
} from '@domain';

export class CreateReservationUseCaseImpl implements CreateReservationUseCase {
  constructor(private readonly reservationRepository: ReservationRepository) {}

  execute(resourceId: string, command: CreateReservationCommand): Promise<Reservation> {
    return this.reservationRepository.create(resourceId, command);
  }
}
