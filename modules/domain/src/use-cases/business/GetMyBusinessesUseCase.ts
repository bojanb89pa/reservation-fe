import type { Business } from '../../entities/Business';
import type { PageRequest, PageResponse } from '../../types/Page';

export interface GetMyBusinessesUseCase {
  execute(pageRequest: PageRequest): Promise<PageResponse<Business>>;
}
