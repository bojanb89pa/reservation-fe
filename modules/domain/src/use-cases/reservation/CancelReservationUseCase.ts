import type { Reservation } from '../../entities/Reservation';

export interface CancelReservationUseCase {
  execute(resourceId: string, id: string): Promise<Reservation>;
}
