import type { PlaceAutocompleteSuggestion } from '../../entities/Place';

export interface SearchPlacesUseCase {
  execute(query: string, sessionToken?: string): Promise<PlaceAutocompleteSuggestion[]>;
}
