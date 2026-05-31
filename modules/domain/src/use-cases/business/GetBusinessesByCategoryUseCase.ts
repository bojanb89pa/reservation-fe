import type { Business } from '../../entities/Business';
import type { PageRequest, PageResponse } from '../../types/Page';

export interface GetBusinessesByCategoryUseCase {
  execute(categoryId: string, pageRequest: PageRequest): Promise<PageResponse<Business>>;
}
