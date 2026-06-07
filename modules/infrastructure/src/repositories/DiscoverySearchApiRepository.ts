import type { AxiosInstance } from 'axios';
import type {
  DiscoverySearchRepository,
  DiscoverySearchQuery,
  SearchResult,
  PageRequest,
  PageResponse,
} from '@domain';

export class DiscoverySearchApiRepository implements DiscoverySearchRepository {
  constructor(private readonly client: AxiosInstance) {}

  async search(
    query: DiscoverySearchQuery,
    pageRequest: PageRequest,
  ): Promise<PageResponse<SearchResult>> {
    const params: Record<string, string> = {
      q: query.q,
      page: String(pageRequest.page),
      size: String(pageRequest.size),
    };
    if (query.city?.trim()) {
      params['city'] = query.city.trim();
    }
    const response = await this.client.get<PageResponse<SearchResult>>('/api/v1/search', { params });
    return response.data;
  }
}
