import type {
  NearbyBusinessRepository,
  SearchNearbyBusinessesUseCase,
  NearbyBusinessSearchFilter,
  NearbyBusiness,
  PageRequest,
  PageResponse,
} from '@domain';

export class SearchNearbyBusinessesUseCaseImpl implements SearchNearbyBusinessesUseCase {
  constructor(private readonly nearbyBusinessRepository: NearbyBusinessRepository) {}

  execute(
    filter: NearbyBusinessSearchFilter,
    pageRequest: PageRequest,
  ): Promise<PageResponse<NearbyBusiness>> {
    return this.nearbyBusinessRepository.search(filter, pageRequest);
  }
}
