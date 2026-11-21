import type { AxiosInstance } from 'axios';
import { normalizeReservationOrigin } from '@fe/domain';
import type { ReservationRepository, Reservation, CreateReservationCommand } from '@fe/domain';

/** BE ReservationResponse: origin/originClient may be missing or unknown (the BE enum may grow). */
type RawReservation = Omit<Reservation, 'origin' | 'originClient'> & {
  origin?: string | null;
  originClient?: string | null;
};

function toReservation(raw: RawReservation): Reservation {
  return {
    ...raw,
    origin: normalizeReservationOrigin(raw.origin),
    originClient: raw.originClient ?? null,
  };
}

export class ReservationApiRepository implements ReservationRepository {
  constructor(private readonly client: AxiosInstance) {}

  async getAll(): Promise<Reservation[]> {
    const response = await this.client.get<RawReservation[]>('/reservations');
    return response.data.map(toReservation);
  }

  async getById(id: string): Promise<Reservation> {
    const response = await this.client.get<RawReservation>(`/reservations/${id}`);
    return toReservation(response.data);
  }

  async create(resourceId: string, command: CreateReservationCommand): Promise<Reservation> {
    const response = await this.client.post<RawReservation>(
      `/resources/${resourceId}/reservations`,
      {
        id: null,
        userId: null,
        resourceId,
        serviceId: command.serviceId,
        startTime: command.startTime,
        endTime: command.endTime,
      },
    );
    return toReservation(response.data);
  }

  async approve(resourceId: string, id: string): Promise<Reservation> {
    const response = await this.client.post<RawReservation>(
      `/resources/${resourceId}/reservations/${id}/approve`,
    );
    return toReservation(response.data);
  }

  async reject(resourceId: string, id: string): Promise<Reservation> {
    const response = await this.client.post<RawReservation>(
      `/resources/${resourceId}/reservations/${id}/reject`,
    );
    return toReservation(response.data);
  }

  async cancel(resourceId: string, id: string): Promise<Reservation> {
    const response = await this.client.post<RawReservation>(
      `/resources/${resourceId}/reservations/${id}/cancel`,
    );
    return toReservation(response.data);
  }
}
