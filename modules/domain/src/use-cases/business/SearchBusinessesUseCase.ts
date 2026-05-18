import type { Business } from '../../entities/Business';
import type { PageRequest, PageResponse } from '../../types/Page';

export interface SearchBusinessesUseCase {
  execute(query: string, pageRequest: PageRequest): Promise<PageResponse<Business>>;
}
