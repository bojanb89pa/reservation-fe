import type { DurationUnit } from './BusinessService';
import type {
  ReservationBusinessInfo,
  ReservationResourceInfo,
  ReservationStatus,
} from './Reservation';

/** `POST /client-applications/reservations` body, sent with the partner access token. */
export interface CreateClientApplicationReservationCommand {
  resourceId: string;
  locationId: string;
  serviceId: string;
  /** LocalDateTime, e.g. `2026-11-01T10:00:00` */
  startTime: string;
  /** LocalDateTime, e.g. `2026-11-01T11:00:00` */
  endTime: string;
}

export interface ClientApplicationReservationServiceInfo {
  id: string;
  name: string;
  minDuration: number;
  maxDuration: number;
  durationUnit: DurationUnit;
  durationStep: number;
}

/** Reservation created by a partner on behalf of its user. */
export interface ClientApplicationReservation {
  id: string;
  /** Set only when the external identity is linked to a Reserva account. */
  userId: string | null;
  resourceId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  // WARNING: BE brief types `status` as string; assumed the regular reservation statuses — verify before merging
  status: ReservationStatus;
  service: ClientApplicationReservationServiceInfo | null;
  resource: ReservationResourceInfo | null;
  business: ReservationBusinessInfo | null;
}
