import type { Reservation } from '../../entities/Reservation';

export interface GetAllReservationsUseCase {
  execute(): Promise<Reservation[]>;
}
