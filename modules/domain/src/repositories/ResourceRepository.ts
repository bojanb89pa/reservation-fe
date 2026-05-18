import type { Resource, CreateResourceCommand } from '../entities/Resource';
import type { PageRequest, PageResponse } from '../types/Page';

export interface ResourceRepository {
  getAllByBusiness(businessId: string, pageRequest: PageRequest): Promise<PageResponse<Resource>>;
  getById(id: string): Promise<Resource>;
  create(businessId: string, command: CreateResourceCommand): Promise<Resource>;
}
