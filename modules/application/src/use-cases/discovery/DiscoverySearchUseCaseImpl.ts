import type {
  DiscoverySearchRepository,
  DiscoverySearchUseCase,
  DiscoverySearchQuery,
  SearchResult,
  PageRequest,
  PageResponse,
} from '@domain';

export class DiscoverySearchUseCaseImpl implements DiscoverySearchUseCase {
  constructor(private readonly repo: DiscoverySearchRepository) {}

  execute(query: DiscoverySearchQuery, pageRequest: PageRequest): Promise<PageResponse<SearchResult>> {
    return this.repo.search(query, pageRequest);
  }
}
