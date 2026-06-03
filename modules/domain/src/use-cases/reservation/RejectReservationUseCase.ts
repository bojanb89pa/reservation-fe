import type { Reservation } from '../../entities/Reservation';

export interface RejectReservationUseCase {
  execute(resourceId: string, id: string): Promise<Reservation>;
}
