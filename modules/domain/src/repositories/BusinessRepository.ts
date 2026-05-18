import type { Business } from '../entities/Business';
import type { PageRequest, PageResponse } from '../types/Page';

export interface BusinessRepository {
  getAll(pageRequest: PageRequest): Promise<PageResponse<Business>>;
  search(query: string, pageRequest: PageRequest): Promise<PageResponse<Business>>;
  getById(id: string): Promise<Business>;
  create(business: Pick<Business, 'name'>): Promise<Business>;
}
