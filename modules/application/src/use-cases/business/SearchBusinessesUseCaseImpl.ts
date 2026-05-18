import type { BusinessRepository, SearchBusinessesUseCase, Business, PageRequest, PageResponse } from '@domain';

export class SearchBusinessesUseCaseImpl implements SearchBusinessesUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(query: string, pageRequest: PageRequest): Promise<PageResponse<Business>> {
    return this.businessRepository.search(query, pageRequest);
  }
}
