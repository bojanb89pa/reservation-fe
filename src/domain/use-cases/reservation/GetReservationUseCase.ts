import type { Reservation } from '../../entities/Reservation';

export interface GetReservationUseCase {
  execute(id: string): Promise<Reservation>;
}
