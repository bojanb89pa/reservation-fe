export type ReservationStatus = 'PENDING_APPROVAL' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';

export interface Reservation {
  id: string | null;
  userId: string | null;
  resourceId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
}

export interface CreateReservationCommand {
  resourceId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
}
