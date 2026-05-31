import type { Business } from '../../entities/Business';
import type { PageRequest, PageResponse } from '../../types/Page';
import type { BusinessSearchFilter } from '../../types/BusinessSearchFilter';

export interface SearchBusinessesUseCase {
  execute(filter: BusinessSearchFilter, pageRequest: PageRequest): Promise<PageResponse<Business>>;
}
