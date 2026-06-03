import type { Reservation } from '../../entities/Reservation';

export interface ApproveReservationUseCase {
  execute(resourceId: string, id: string): Promise<Reservation>;
}
