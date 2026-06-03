import type { Reservation, CreateReservationCommand } from '../entities/Reservation';

export interface ReservationRepository {
  getById(id: string): Promise<Reservation>;
  create(resourceId: string, command: CreateReservationCommand): Promise<Reservation>;
  approve(resourceId: string, id: string): Promise<Reservation>;
  reject(resourceId: string, id: string): Promise<Reservation>;
}
