import type { Reservation, CreateReservationCommand } from '../../entities/Reservation';

export interface CreateReservationUseCase {
  execute(resourceId: string, command: CreateReservationCommand): Promise<Reservation>;
}
