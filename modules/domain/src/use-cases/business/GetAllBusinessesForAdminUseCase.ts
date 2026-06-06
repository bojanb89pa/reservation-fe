import type { Business } from '../../entities/Business';
import type { PageRequest, PageResponse } from '../../types/Page';

export interface GetAllBusinessesForAdminUseCase {
  execute(pageRequest: PageRequest): Promise<PageResponse<Business>>;
}
