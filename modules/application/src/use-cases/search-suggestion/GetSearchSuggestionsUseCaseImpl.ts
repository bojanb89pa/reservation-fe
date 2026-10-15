import type {
  GetSearchSuggestionsUseCase,
  SearchSuggestion,
  SearchSuggestionRepository,
  SearchSuggestionsQuery,
} from '@fe/domain';

export class GetSearchSuggestionsUseCaseImpl implements GetSearchSuggestionsUseCase {
  constructor(private readonly searchSuggestionRepository: SearchSuggestionRepository) {}

  async execute(query: SearchSuggestionsQuery): Promise<SearchSuggestion[]> {
    // Blank input is never sent to the server.
    if (query.q.trim() === '') {
      return [];
    }
    // Server order (PLACE, CATEGORY, BUSINESS) is authoritative; result is returned untouched.
    return this.searchSuggestionRepository.getSuggestions(query);
  }
}
