import type { Resource } from '../../entities/Resource';
import type { PageRequest, PageResponse } from '../../types/Page';

export interface GetAllResourcesUseCase {
  execute(businessId: string, pageRequest: PageRequest): Promise<PageResponse<Resource>>;
}
