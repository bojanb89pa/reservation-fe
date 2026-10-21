import type { AxiosInstance } from 'axios';
import type {
  ClientApplicationReservation,
  ClientApplicationWidgetConfig,
  ClientApplicationWidgetRepository,
  CreateClientApplicationReservationCommand,
} from '@fe/domain';

export class ClientApplicationWidgetApiRepository implements ClientApplicationWidgetRepository {
  /** @param client resource-service client without user auth interceptors (`publicResourceAxiosClient`) */
  constructor(private readonly client: AxiosInstance) {}

  async getWidgetConfig(clientApplicationId: string): Promise<ClientApplicationWidgetConfig> {
    const response = await this.client.get<ClientApplicationWidgetConfig>(
      `/client-applications/${clientApplicationId}/widget-config`,
    );
    return response.data;
  }

  async createReservation(
    partnerAccessToken: string,
    command: CreateClientApplicationReservationCommand,
  ): Promise<ClientApplicationReservation> {
    const response = await this.client.post<ClientApplicationReservation>(
      '/client-applications/reservations',
      {
        resourceId: command.resourceId,
        locationId: command.locationId,
        serviceId: command.serviceId,
        startTime: command.startTime,
        endTime: command.endTime,
      },
      { headers: { Authorization: `Bearer ${partnerAccessToken}` } },
    );
    return response.data;
  }
}
