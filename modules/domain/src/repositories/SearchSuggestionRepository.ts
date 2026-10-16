import type { SearchSuggestion } from '../entities/SearchSuggestion';
import type { SearchSuggestionsQuery } from '../types/SearchSuggestionsQuery';

export interface SearchSuggestionRepository {
  /** Returns suggestions in server order (PLACE, then CATEGORY, then BUSINESS); never re-sorted. */
  getSuggestions(query: SearchSuggestionsQuery): Promise<SearchSuggestion[]>;
}
