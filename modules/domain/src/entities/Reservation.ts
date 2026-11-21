import type { DurationUnit } from './BusinessService';
import type { ResourceType } from './ResourceType';

export type ReservationStatus = 'PENDING_APPROVAL' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';

export type ReservationOrigin = 'RESERVA_APP' | 'CLIENT_APPLICATION' | 'AI_ASSISTANT';

const KNOWN_RESERVATION_ORIGINS: readonly ReservationOrigin[] = [
  'RESERVA_APP',
  'CLIENT_APPLICATION',
  'AI_ASSISTANT',
];

/** The BE enum may grow: any unknown value is treated as RESERVA_APP. */
export function normalizeReservationOrigin(value: string | null | undefined): ReservationOrigin {
  return KNOWN_RESERVATION_ORIGINS.find((origin) => origin === value) ?? 'RESERVA_APP';
}

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
  origin: ReservationOrigin;
  /** External text (MCP client name, e.g. "Claude"); set only when origin is AI_ASSISTANT. Render as plain text. */
  originClient: string | null;
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
