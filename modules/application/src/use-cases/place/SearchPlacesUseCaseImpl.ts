import type { PlaceAutocompleteSuggestion, PlaceRepository, SearchPlacesUseCase } from '@domain';

export class SearchPlacesUseCaseImpl implements SearchPlacesUseCase {
  constructor(private readonly placeRepository: PlaceRepository) {}

  execute(query: string, sessionToken?: string): Promise<PlaceAutocompleteSuggestion[]> {
    return this.placeRepository.search(query, sessionToken);
  }
}
