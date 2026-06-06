import type { AxiosInstance } from 'axios';
import type { PlaceRepository, PlaceAutocompleteSuggestion, PlaceDetails } from '@domain';

export class PlaceApiRepository implements PlaceRepository {
  constructor(private readonly client: AxiosInstance) {}

  async search(query: string, sessionToken?: string): Promise<PlaceAutocompleteSuggestion[]> {
    const params: Record<string, string> = { query };
    if (sessionToken) params.sessionToken = sessionToken;
    const response = await this.client.get<PlaceAutocompleteSuggestion[]>('/api/places/search', {
      params,
    });
    return response.data;
  }

  async getDetails(placeId: string, sessionToken?: string): Promise<PlaceDetails> {
    const params: Record<string, string> = {};
    if (sessionToken) params.sessionToken = sessionToken;
    const response = await this.client.get<PlaceDetails>(`/api/places/${placeId}`, { params });
    return response.data;
  }
}
