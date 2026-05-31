import type {
  BusinessRepository,
  SearchBusinessesUseCase,
  BusinessSearchFilter,
  Business,
  PageRequest,
  PageResponse,
} from '@domain';

export class SearchBusinessesUseCaseImpl implements SearchBusinessesUseCase {
  constructor(private readonly businessRepository: BusinessRepository) {}

  execute(filter: BusinessSearchFilter, pageRequest: PageRequest): Promise<PageResponse<Business>> {
    return this.businessRepository.search(filter, pageRequest);
  }
}
