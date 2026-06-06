import type { PlaceAutocompleteSuggestion, PlaceDetails } from '../entities/Place';

export interface PlaceRepository {
  search(query: string, sessionToken?: string): Promise<PlaceAutocompleteSuggestion[]>;
  getDetails(placeId: string, sessionToken?: string): Promise<PlaceDetails>;
}
