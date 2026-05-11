export interface Reservation {
  id: string | null;
  userId: string | null;
  resourceId: string;
  startTime: string;
  endTime: string;
}

export interface CreateReservationCommand {
  resourceId: string;
  startTime: string;
  endTime: string;
}
