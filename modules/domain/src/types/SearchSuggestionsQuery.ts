export interface SearchSuggestionsQuery {
  q: string;
  /** BCP 47 tag for category names; when omitted the BE falls back to Accept-Language, then `en`. */
  lang?: string;
}
