import type { AxiosInstance } from 'axios';
import type {
  SearchSuggestion,
  SearchSuggestionRepository,
  SearchSuggestionsQuery,
} from '@fe/domain';

export class SearchSuggestionApiRepository implements SearchSuggestionRepository {
  constructor(private readonly client: AxiosInstance) {}

  // WARNING: errors are normalized by the injected client's response interceptor (normalizeAxiosError); re-normalizing here would drop the HTTP status — verify before merging
  async getSuggestions(query: SearchSuggestionsQuery): Promise<SearchSuggestion[]> {
    const params: Record<string, string> = { q: query.q };
    if (query.lang) {
      params['lang'] = query.lang;
    }
    const response = await this.client.get<SearchSuggestion[]>('/v1/search/suggestions', {
      params,
    });
    return response.data;
  }
}
