import type { SearchResult } from '../entities/SearchResult';
import type { DiscoverySearchQuery } from '../types/DiscoverySearchQuery';
import type { PageRequest, PageResponse } from '../types/Page';

export interface DiscoverySearchRepository {
  search(query: DiscoverySearchQuery, pageRequest: PageRequest): Promise<PageResponse<SearchResult>>;
}
