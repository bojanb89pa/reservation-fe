import type { SearchSuggestion } from '../../entities/SearchSuggestion';
import type { SearchSuggestionsQuery } from '../../types/SearchSuggestionsQuery';

export interface GetSearchSuggestionsUseCase {
  execute(query: SearchSuggestionsQuery): Promise<SearchSuggestion[]>;
}
