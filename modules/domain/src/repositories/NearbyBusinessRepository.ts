import type { NearbyBusiness } from '../entities/NearbyBusiness';
import type { NearbyBusinessSearchFilter } from '../types/NearbyBusinessSearchFilter';
import type { PageRequest, PageResponse } from '../types/Page';

export interface NearbyBusinessRepository {
  search(filter: NearbyBusinessSearchFilter, pageRequest: PageRequest): Promise<PageResponse<NearbyBusiness>>;
}
