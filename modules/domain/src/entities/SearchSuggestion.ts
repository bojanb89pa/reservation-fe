export type SearchSuggestionType = 'PLACE' | 'CATEGORY' | 'BUSINESS';

export interface SearchSuggestion {
  type: SearchSuggestionType;
  /** PLACE: city name (not a UUID); CATEGORY / BUSINESS: UUID. */
  id: string;
  /** Display text; category names are localized. */
  name: string;
}
