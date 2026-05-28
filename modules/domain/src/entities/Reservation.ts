export interface Reservation {
  id: string | null;
  userId: string | null;
  resourceId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
}

export interface CreateReservationCommand {
  resourceId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
}
