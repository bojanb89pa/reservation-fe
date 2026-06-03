import type { AxiosInstance } from 'axios';
import type { ReservationRepository, Reservation, CreateReservationCommand } from '@domain';

export class ReservationApiRepository implements ReservationRepository {
  constructor(private readonly client: AxiosInstance) {}

  async getById(id: string): Promise<Reservation> {
    // The BE endpoint is GET /api/resources/{resourceId}/reservations/{id}
    // We use a generic lookup — resourceId is embedded via the reservation itself
    const response = await this.client.get<Reservation>(`/api/reservations/${id}`);
    return response.data;
  }

  async create(resourceId: string, command: CreateReservationCommand): Promise<Reservation> {
    const response = await this.client.post<Reservation>(
      `/api/resources/${resourceId}/reservations`,
      {
        id: null,
        userId: null,
        resourceId,
        serviceId: command.serviceId,
        startTime: command.startTime,
        endTime: command.endTime,
      },
    );
    return response.data;
  }

  async approve(resourceId: string, id: string): Promise<Reservation> {
    const response = await this.client.post<Reservation>(
      `/api/resources/${resourceId}/reservations/${id}/approve`,
    );
    return response.data;
  }

  async reject(resourceId: string, id: string): Promise<Reservation> {
    const response = await this.client.post<Reservation>(
      `/api/resources/${resourceId}/reservations/${id}/reject`,
    );
    return response.data;
  }
}
