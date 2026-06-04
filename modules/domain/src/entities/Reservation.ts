import type { DurationUnit } from './BusinessService';
import type { ResourceType } from './ResourceType';

export type ReservationStatus = 'PENDING_APPROVAL' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';

export interface ReservationServiceInfo {
  id: string;
  name: string;
  duration: number;
  durationUnit: DurationUnit;
}

export interface ReservationResourceInfo {
  id: string;
  name: string;
  type: ResourceType;
}

export interface ReservationBusinessInfo {
  id: string;
  name: string;
}

export interface Reservation {
  id: string | null;
  userId: string | null;
  resourceId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  service: ReservationServiceInfo | null;
  resource: ReservationResourceInfo | null;
  business: ReservationBusinessInfo | null;
}

export interface CreateReservationCommand {
  resourceId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
}
